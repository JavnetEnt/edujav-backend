import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  ConfigureSchoolBankDto,
  CreateFeeItemDto,
  GenerateClassInvoicesDto,
  InitializePaystackPaymentDto,
  RecordManualPaymentDto,
} from './dto/finance.dto.js';
import { FinanceService } from './finance.service.js';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Public Paystack Webhook (No JWT — verified via HMAC-SHA512 signature)
  @Post('webhooks/paystack')
  handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: any,
  ) {
    if (!request.rawBody) {
      throw new BadRequestException('Paystack webhook raw body is unavailable');
    }

    return this.financeService.handlePaystackWebhook(
      signature,
      request.rawBody,
      payload,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER)
  @Post('bank-account')
  configureBankAccount(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ConfigureSchoolBankDto,
  ) {
    return this.financeService.configureSchoolBankAccount(user.tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR)
  @Post('fee-items')
  createFeeItem(@CurrentUser() user: JwtUserPayload, @Body() dto: CreateFeeItemDto) {
    return this.financeService.createFeeItem(user.tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR)
  @Post('invoices/generate-class')
  generateClassInvoices(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GenerateClassInvoicesDto,
  ) {
    return this.financeService.generateClassInvoices(user.tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR, Role.PARENT, Role.STUDENT)
  @Post('paystack/initialize')
  initializePaystack(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: InitializePaystackPaymentDto,
  ) {
    return this.financeService.initializePaystackPayment(user.tenantId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR)
  @Post('payments/manual')
  recordManualPayment(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: RecordManualPaymentDto,
  ) {
    return this.financeService.recordManualPayment(user.tenantId, user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SCHOOL_OWNER, Role.ADMIN, Role.BURSAR)
  @Get('summary')
  getFinancialSummary(
    @CurrentUser() user: JwtUserPayload,
    @Query('termId') termId: string,
  ) {
    return this.financeService.getTermFinancialSummary(user.tenantId, termId);
  }
}
