import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, StudentInvoice } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConfigureSchoolBankDto,
  CreateFeeItemDto,
  GenerateClassInvoicesDto,
  InitializePaystackPaymentDto,
  RecordManualPaymentDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // 0. Register School's Bank Account via Paystack Subaccount API
  async configureSchoolBankAccount(tenantId: string, dto: ConfigureSchoolBankDto) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: tenant.name,
        settlement_bank: dto.bankCode,
        account_number: dto.accountNumber,
        percentage_charge: dto.platformFeePercentage ?? 0,
        primary_contact_email: tenant.email,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException(
        data.message || 'Failed to verify bank account with Paystack',
      );
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { paystackSubaccountCode: data.data.subaccount_code },
    });

    return {
      message: 'School settlement bank account configured successfully',
      bankName: data.data.settlement_bank,
      accountNumber: data.data.account_number,
      subaccountCode: updatedTenant.paystackSubaccountCode,
    };
  }

  // 1. Add a Fee Line Item for a Class & Term
  async createFeeItem(tenantId: string, dto: CreateFeeItemDto) {
    return this.prisma.feeStructure.create({
      data: {
        tenantId,
        classRoomId: dto.classRoomId,
        termId: dto.termId,
        title: dto.title.trim(),
        amount: dto.amount,
        isMandatory: dto.isMandatory ?? true,
      },
    });
  }

  // 2. Generate Invoices for Every Student in a Class
  async generateClassInvoices(tenantId: string, dto: GenerateClassInvoicesDto) {
    const feeItems = await this.prisma.feeStructure.findMany({
      where: { tenantId, classRoomId: dto.classRoomId, termId: dto.termId },
    });

    if (!feeItems.length) {
      throw new BadRequestException('No fee structure configured for this class and term yet');
    }

    const totalFee = feeItems.reduce((sum, item) => sum + item.amount, 0);

    const students = await this.prisma.studentProfile.findMany({
      where: { tenantId, classRoomId: dto.classRoomId },
    });

    if (!students.length) {
      throw new NotFoundException('No students enrolled in this class');
    }

    const year = new Date().getFullYear();
    const existingCount = await this.prisma.studentInvoice.count({ where: { tenantId } });

    const createdInvoices = await this.prisma.$transaction(async (tx) => {
      const results: StudentInvoice[] = [];
      let offset = 1;

      for (const student of students) {
        const existing = await tx.studentInvoice.findUnique({
          where: {
            tenantId_studentId_termId: {
              tenantId,
              studentId: student.id,
              termId: dto.termId,
            },
          },
        });

        if (existing) continue;

        const invoiceNumber = `INV-${year}-${String(existingCount + offset).padStart(5, '0')}`;
        offset++;

        const inv = await tx.studentInvoice.create({
          data: {
            tenantId,
            studentId: student.id,
            termId: dto.termId,
            invoiceNumber,
            totalAmount: totalFee,
            amountPaid: 0,
            balance: totalFee,
            status: InvoiceStatus.UNPAID,
          },
        });
        results.push(inv);
      }

      return results;
    });

    return {
      message: `Generated ${createdInvoices.length} student invoices`,
      feeBreakdown: feeItems,
      totalPerStudent: totalFee,
      newlyGeneratedCount: createdInvoices.length,
    };
  }

  // 3. Initialize Paystack Payment (Routes Funds Directly to School's Subaccount!)
  async initializePaystackPayment(tenantId: string, dto: InitializePaystackPaymentDto) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      include: { tenant: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (!invoice.tenant.paystackSubaccountCode) {
      throw new BadRequestException(
        'This school has not configured its settlement bank account yet',
      );
    }
    if (invoice.status === InvoiceStatus.PAID || invoice.balance <= 0) {
      throw new BadRequestException('This invoice has already been fully paid');
    }
    if (dto.amount > invoice.balance) {
      throw new BadRequestException(
        `Amount (${dto.amount}) exceeds remaining invoice balance (${invoice.balance})`,
      );
    }

    const reference = `PSK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: dto.payerEmail,
        amount: Math.round(dto.amount * 100), // Amount in kobo
        reference,
        subaccount: invoice.tenant.paystackSubaccountCode,
        bearer: 'subaccount',
        metadata: {
          tenantId,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException(data.message || 'Unable to initialize Paystack checkout');
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference,
    };
  }

  // 4. Paystack Webhook Handler
  async handlePaystackWebhook(signature: string, rawBody: Buffer, payload: any) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

    if (hash !== signature) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    if (payload.event !== 'charge.success') {
      return { received: true };
    }

    const { reference, amount, metadata } = payload.data;
    const paidAmountNaira = amount / 100;
    const { tenantId, invoiceId } = metadata || {};

    if (!tenantId || !invoiceId) {
      return { received: true };
    }

    const alreadyProcessed = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
    });
    if (alreadyProcessed) {
      return { received: true, status: 'already_processed' };
    }

    await this.applyPaymentToInvoice({
      tenantId,
      invoiceId,
      amount: paidAmountNaira,
      method: PaymentMethod.PAYSTACK,
      reference,
    });

    return { received: true, status: 'credited' };
  }

  // 5. Bursar Manual Payment Recording
  async recordManualPayment(
    tenantId: string,
    bursarId: string,
    dto: RecordManualPaymentDto,
  ) {
    const reference =
      dto.reference || `MAN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return this.applyPaymentToInvoice({
      tenantId,
      invoiceId: dto.invoiceId,
      amount: dto.amount,
      method: dto.method,
      reference,
      recordedBy: bursarId,
    });
  }

  private async applyPaymentToInvoice(params: {
    tenantId: string;
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    reference: string;
    recordedBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.studentInvoice.findFirst({
        where: { id: params.invoiceId, tenantId: params.tenantId },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (params.amount > invoice.balance) {
        throw new BadRequestException('Payment amount exceeds remaining balance');
      }

      const newAmountPaid = Number((invoice.amountPaid + params.amount).toFixed(2));
      const newBalance = Number((invoice.totalAmount - newAmountPaid).toFixed(2));
      const newStatus = newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      const receiptNumber = `RCP-${new Date().getFullYear()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      const transaction = await tx.paymentTransaction.create({
        data: {
          tenantId: params.tenantId,
          invoiceId: invoice.id,
          reference: params.reference,
          receiptNumber,
          amount: params.amount,
          method: params.method,
          recordedBy: params.recordedBy,
        },
      });

      const updatedInvoice = await tx.studentInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      return {
        message: 'Payment recorded and receipt generated',
        receipt: transaction,
        invoice: updatedInvoice,
      };
    });
  }

 // 6. Financial Summary
  async getTermFinancialSummary(tenantId: string, termId: string) {
    const invoices = await this.prisma.studentInvoice.findMany({
      where: { tenantId, termId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            classRoom: { select: { name: true, arm: true } },
          },
        },
      },
    });

    const expectedRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const collectedRevenue = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const outstandingDebt = invoices.reduce((s, i) => s + i.balance, 0);
    const debtors = invoices.filter((i) => i.balance > 0);

    return {
      expectedRevenue,
      collectedRevenue,
      outstandingDebt,
      collectionRate:
        expectedRevenue > 0
          ? `${((collectedRevenue / expectedRevenue) * 100).toFixed(1)}%`
          : '0%',
      totalInvoices: invoices.length,
      paidCount: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      debtorsCount: debtors.length,
      debtors,
    };
  }
}