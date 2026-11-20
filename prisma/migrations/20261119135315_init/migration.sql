-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SCHOOL_OWNER', 'ADMIN', 'BURSAR', 'TEACHER', 'PARENT', 'STUDENT');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1E40AF',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "caWeight" INTEGER NOT NULL DEFAULT 40,
    "examWeight" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arm" TEXT,

    CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "classRoomId" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Parent',

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "remark" TEXT NOT NULL,

    CONSTRAINT "GradingScale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "AcademicSession_tenantId_idx" ON "AcademicSession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicSession_tenantId_name_key" ON "AcademicSession"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Term_tenantId_sessionId_idx" ON "Term"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "ClassRoom_tenantId_idx" ON "ClassRoom"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_tenantId_name_arm_key" ON "ClassRoom"("tenantId", "name", "arm");

-- CreateIndex
CREATE INDEX "Subject_tenantId_idx" ON "Subject"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_tenantId_name_key" ON "Subject"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_tenantId_classRoomId_idx" ON "StudentProfile"("tenantId", "classRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_tenantId_admissionNumber_key" ON "StudentProfile"("tenantId", "admissionNumber");

-- CreateIndex
CREATE INDEX "ParentStudent_tenantId_idx" ON "ParentStudent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "GradingScale_tenantId_idx" ON "GradingScale"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSession" ADD CONSTRAINT "AcademicSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingScale" ADD CONSTRAINT "GradingScale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
