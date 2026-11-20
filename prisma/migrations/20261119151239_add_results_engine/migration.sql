-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "ca1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ca2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exam" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" TEXT,
    "remark" TEXT,
    "recordedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "averageScore" DOUBLE PRECISION NOT NULL,
    "positionInClass" INTEGER NOT NULL,
    "totalStudents" INTEGER NOT NULL,
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "verificationCode" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Score_tenantId_classRoomId_termId_idx" ON "Score"("tenantId", "classRoomId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_tenantId_studentId_subjectId_termId_key" ON "Score"("tenantId", "studentId", "subjectId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_verificationCode_key" ON "ReportCard"("verificationCode");

-- CreateIndex
CREATE INDEX "ReportCard_tenantId_classRoomId_termId_idx" ON "ReportCard"("tenantId", "classRoomId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_tenantId_studentId_termId_key" ON "ReportCard"("tenantId", "studentId", "termId");

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
