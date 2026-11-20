import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateFeeItemDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  termId: string;

  @IsString()
  @IsNotEmpty()
  title: string; // e.g., "Tuition Fee"

  @IsNumber()
  @Min(1)
  amount: number;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;
}

export class GenerateClassInvoicesDto {
  @IsUUID()
  classRoomId: string;

  @IsUUID()
  termId: string;
}

export class InitializePaystackPaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @Min(100)
  amount: number; // Supports full or installment payment!

  @IsEmail()
  payerEmail: string;
}

export class RecordManualPaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum([PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER])
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class ConfigureSchoolBankDto {
  @IsString()
  @IsNotEmpty()
  bankCode: string; // Nigerian CBN bank code (e.g., "058" for GTBank, "057" for Zenith)

  @IsString()
  @IsNotEmpty()
  accountNumber: string; // 10-digit NUBAN account number

  @IsNumber()
  @Min(0)
  @IsOptional()
  platformFeePercentage?: number; // e.g., 1.5 means 1.5% platform commission, 98.5% to school
}
