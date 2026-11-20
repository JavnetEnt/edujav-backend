-- AlterTable
ALTER TABLE "ClassRoom" ADD COLUMN     "formTeacherId" TEXT;

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAssignment_tenantId_teacherId_idx" ON "TeacherAssignment"("tenantId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_tenantId_teacherId_classRoomId_subjectId_key" ON "TeacherAssignment"("tenantId", "teacherId", "classRoomId", "subjectId");

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
