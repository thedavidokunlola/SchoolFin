-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'BURSAR', 'ACCOUNTANT', 'PROPRIETOR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'USSD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DebtStage" AS ENUM ('REMINDER', 'ESCALATION', 'FINAL_NOTICE');

-- CreateEnum
CREATE TYPE "FeePostingType" AS ENUM ('CHARGE', 'REVERSAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creditBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Parent',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentDueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeLineItem" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FeeLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePosting" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "FeePostingType" NOT NULL DEFAULT 'CHARGE',
    "postedById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "flutterwaveRef" TEXT,
    "internalRef" TEXT NOT NULL,
    "channel" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installmentId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "numberOfParts" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "cardToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualCredit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNote" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptId" TEXT,

    CONSTRAINT "ManualCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentId" TEXT,
    "manualCreditId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtCollectionRule" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "stage" "DebtStage" NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtCollectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtCollectionEvent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "stage" "DebtStage" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',

    CONSTRAINT "DebtCollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE INDEX "Student_admissionNumber_idx" ON "Student"("admissionNumber");

-- CreateIndex
CREATE INDEX "Student_class_idx" ON "Student"("class");

-- CreateIndex
CREATE INDEX "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "AcademicTerm_isActive_idx" ON "AcademicTerm"("isActive");

-- CreateIndex
CREATE INDEX "FeeStructure_class_idx" ON "FeeStructure"("class");

-- CreateIndex
CREATE INDEX "FeeStructure_termId_idx" ON "FeeStructure"("termId");

-- CreateIndex
CREATE INDEX "FeeLineItem_feeStructureId_idx" ON "FeeLineItem"("feeStructureId");

-- CreateIndex
CREATE INDEX "FeePosting_studentId_idx" ON "FeePosting"("studentId");

-- CreateIndex
CREATE INDEX "FeePosting_termId_idx" ON "FeePosting"("termId");

-- CreateIndex
CREATE INDEX "FeePosting_postedAt_idx" ON "FeePosting"("postedAt");

-- CreateIndex
CREATE INDEX "FeePosting_type_idx" ON "FeePosting"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_flutterwaveRef_key" ON "Payment"("flutterwaveRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_internalRef_key" ON "Payment"("internalRef");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_flutterwaveRef_idx" ON "Payment"("flutterwaveRef");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Installment_studentId_idx" ON "Installment"("studentId");

-- CreateIndex
CREATE INDEX "Installment_dueDate_idx" ON "Installment"("dueDate");

-- CreateIndex
CREATE INDEX "Installment_isFlagged_idx" ON "Installment"("isFlagged");

-- CreateIndex
CREATE UNIQUE INDEX "ManualCredit_receiptId_key" ON "ManualCredit"("receiptId");

-- CreateIndex
CREATE INDEX "ManualCredit_studentId_idx" ON "ManualCredit"("studentId");

-- CreateIndex
CREATE INDEX "ManualCredit_recordedAt_idx" ON "ManualCredit"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_manualCreditId_key" ON "Receipt"("manualCreditId");

-- CreateIndex
CREATE INDEX "Receipt_studentId_idx" ON "Receipt"("studentId");

-- CreateIndex
CREATE INDEX "Receipt_receiptNumber_idx" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "Receipt_issuedAt_idx" ON "Receipt"("issuedAt");

-- CreateIndex
CREATE INDEX "DebtCollectionRule_termId_idx" ON "DebtCollectionRule"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "DebtCollectionRule_termId_stage_key" ON "DebtCollectionRule"("termId", "stage");

-- CreateIndex
CREATE INDEX "CommunicationTemplate_channel_idx" ON "CommunicationTemplate"("channel");

-- CreateIndex
CREATE INDEX "DebtCollectionEvent_studentId_idx" ON "DebtCollectionEvent"("studentId");

-- CreateIndex
CREATE INDEX "DebtCollectionEvent_ruleId_idx" ON "DebtCollectionEvent"("ruleId");

-- CreateIndex
CREATE INDEX "DebtCollectionEvent_sentAt_idx" ON "DebtCollectionEvent"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_studentId_idx" ON "Notification"("studentId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "StudentNote_studentId_idx" ON "StudentNote"("studentId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_isSensitive_idx" ON "AuditLog"("isSensitive");

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLineItem" ADD CONSTRAINT "FeeLineItem_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePosting" ADD CONSTRAINT "FeePosting_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePosting" ADD CONSTRAINT "FeePosting_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePosting" ADD CONSTRAINT "FeePosting_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePosting" ADD CONSTRAINT "FeePosting_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCredit" ADD CONSTRAINT "ManualCredit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCredit" ADD CONSTRAINT "ManualCredit_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualCredit" ADD CONSTRAINT "ManualCredit_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtCollectionRule" ADD CONSTRAINT "DebtCollectionRule_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtCollectionRule" ADD CONSTRAINT "DebtCollectionRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtCollectionEvent" ADD CONSTRAINT "DebtCollectionEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtCollectionEvent" ADD CONSTRAINT "DebtCollectionEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "DebtCollectionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- =============================================
-- SEED DATA: Demo Accounts
-- =============================================

-- Insert Academic Term
INSERT INTO "AcademicTerm" ("id", "name", "startDate", "endDate", "paymentDueDate", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '2026/2027 First Term', '2026-09-07', '2026-12-18', '2026-10-15', true, NOW(), NOW());

-- Insert Users (password: SchoolFin@123)
INSERT INTO "User" ("id", "email", "firstName", "lastName", "role", "hashedPassword", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'proprietor@princeofpeaceschool.com', 'Mrs.', 'Oduwoye', 'PROPRIETOR', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'bursar@princeofpeaceschool.com', 'Mrs.', 'Oduwoye', 'BURSAR', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'accountant@princeofpeaceschool.com', 'Mr. Tunde', 'Bakare', 'ACCOUNTANT', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'parent@example.com', 'Dr. Oladipo', 'Okonkwo', 'PARENT', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW());
