-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYSTACK', 'BANK_TRANSFER', 'CASH');

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "recordedBy" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeStructure_tenantId_classRoomId_termId_idx" ON "FeeStructure"("tenantId", "classRoomId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvoice_invoiceNumber_key" ON "StudentInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "StudentInvoice_tenantId_termId_status_idx" ON "StudentInvoice"("tenantId", "termId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvoice_tenantId_studentId_termId_key" ON "StudentInvoice"("tenantId", "studentId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "PaymentTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_receiptNumber_key" ON "PaymentTransaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_tenantId_invoiceId_idx" ON "PaymentTransaction"("tenantId", "invoiceId");

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvoice" ADD CONSTRAINT "StudentInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvoice" ADD CONSTRAINT "StudentInvoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvoice" ADD CONSTRAINT "StudentInvoice_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "StudentInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
