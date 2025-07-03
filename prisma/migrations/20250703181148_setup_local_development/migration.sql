/*
  Warnings:

  - You are about to drop the column `accountingReferenceDate` on the `clients` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LtdAccountsWorkflowStage" AS ENUM ('WAITING_FOR_YEAR_END', 'PAPERWORK_PENDING_CHASE', 'PAPERWORK_CHASED', 'PAPERWORK_RECEIVED', 'WORK_IN_PROGRESS', 'DISCUSS_WITH_MANAGER', 'REVIEW_BY_PARTNER', 'REVIEW_DONE_HELLO_SIGN', 'SENT_TO_CLIENT_HELLO_SIGN', 'APPROVED_BY_CLIENT', 'SUBMISSION_APPROVED_PARTNER', 'FILED_TO_COMPANIES_HOUSE', 'FILED_TO_HMRC', 'CLIENT_SELF_FILING', 'REVIEWED_BY_MANAGER', 'REVIEWED_BY_PARTNER');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VATWorkflowStage" ADD VALUE 'REVIEWED_BY_MANAGER';
ALTER TYPE "VATWorkflowStage" ADD VALUE 'REVIEWED_BY_PARTNER';

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "accountingReferenceDate",
ADD COLUMN     "chaseTeamUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nextYearEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "ltdWorkflowAutomationEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isOtpVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastOtpSentAt" TIMESTAMP(3),
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vat_quarters" ALTER COLUMN "currentStage" SET DEFAULT 'PAPERWORK_PENDING_CHASE';

-- CreateTable
CREATE TABLE "ltd_accounts_workflows" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "filingPeriodStart" TIMESTAMP(3) NOT NULL,
    "filingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "accountsDueDate" TIMESTAMP(3) NOT NULL,
    "ctDueDate" TIMESTAMP(3) NOT NULL,
    "csDueDate" TIMESTAMP(3) NOT NULL,
    "currentStage" "LtdAccountsWorkflowStage" NOT NULL DEFAULT 'PAPERWORK_PENDING_CHASE',
    "assignedUserId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chaseStartedDate" TIMESTAMP(3),
    "chaseStartedByUserId" TEXT,
    "chaseStartedByUserName" TEXT,
    "paperworkReceivedDate" TIMESTAMP(3),
    "paperworkReceivedByUserId" TEXT,
    "paperworkReceivedByUserName" TEXT,
    "workStartedDate" TIMESTAMP(3),
    "workStartedByUserId" TEXT,
    "workStartedByUserName" TEXT,
    "managerDiscussionDate" TIMESTAMP(3),
    "managerDiscussionByUserId" TEXT,
    "managerDiscussionByUserName" TEXT,
    "partnerReviewDate" TIMESTAMP(3),
    "partnerReviewByUserId" TEXT,
    "partnerReviewByUserName" TEXT,
    "reviewCompletedDate" TIMESTAMP(3),
    "reviewCompletedByUserId" TEXT,
    "reviewCompletedByUserName" TEXT,
    "sentToClientDate" TIMESTAMP(3),
    "sentToClientByUserId" TEXT,
    "sentToClientByUserName" TEXT,
    "clientApprovedDate" TIMESTAMP(3),
    "clientApprovedByUserId" TEXT,
    "clientApprovedByUserName" TEXT,
    "partnerApprovedDate" TIMESTAMP(3),
    "partnerApprovedByUserId" TEXT,
    "partnerApprovedByUserName" TEXT,
    "filedDate" TIMESTAMP(3),
    "filedByUserId" TEXT,
    "filedByUserName" TEXT,
    "filedToCompaniesHouseDate" TIMESTAMP(3),
    "filedToCompaniesHouseByUserId" TEXT,
    "filedToCompaniesHouseByUserName" TEXT,
    "filedToHMRCDate" TIMESTAMP(3),
    "filedToHMRCByUserId" TEXT,
    "filedToHMRCByUserName" TEXT,
    "clientSelfFilingDate" TIMESTAMP(3),
    "clientSelfFilingByUserId" TEXT,
    "clientSelfFilingByUserName" TEXT,

    CONSTRAINT "ltd_accounts_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ltd_accounts_workflow_history" (
    "id" TEXT NOT NULL,
    "ltdAccountsWorkflowId" TEXT NOT NULL,
    "fromStage" "LtdAccountsWorkflowStage",
    "toStage" "LtdAccountsWorkflowStage" NOT NULL,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysInPreviousStage" INTEGER,

    CONSTRAINT "ltd_accounts_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "clientId" TEXT,
    "workflowType" TEXT,
    "workflowId" TEXT,
    "triggeredBy" TEXT NOT NULL,
    "fromEmail" TEXT DEFAULT 'noreply@numericalz.com',
    "fromName" TEXT DEFAULT 'Numericalz',

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ltd_accounts_workflows_assignedUserId_idx" ON "ltd_accounts_workflows"("assignedUserId");

-- CreateIndex
CREATE INDEX "ltd_accounts_workflows_clientId_idx" ON "ltd_accounts_workflows"("clientId");

-- CreateIndex
CREATE INDEX "ltd_accounts_workflows_currentStage_idx" ON "ltd_accounts_workflows"("currentStage");

-- CreateIndex
CREATE INDEX "ltd_accounts_workflows_filingPeriodEnd_idx" ON "ltd_accounts_workflows"("filingPeriodEnd");

-- CreateIndex
CREATE INDEX "ltd_accounts_workflow_history_ltdAccountsWorkflowId_idx" ON "ltd_accounts_workflow_history"("ltdAccountsWorkflowId");

-- CreateIndex
CREATE INDEX "email_logs_clientId_idx" ON "email_logs"("clientId");

-- CreateIndex
CREATE INDEX "email_logs_createdAt_idx" ON "email_logs"("createdAt");

-- CreateIndex
CREATE INDEX "email_logs_emailType_idx" ON "email_logs"("emailType");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_triggeredBy_idx" ON "email_logs"("triggeredBy");

-- CreateIndex
CREATE INDEX "clients_chaseTeamUserIds_idx" ON "clients" USING GIN ("chaseTeamUserIds");

-- CreateIndex
CREATE INDEX "users_otpCode_idx" ON "users"("otpCode");

-- CreateIndex
CREATE INDEX "users_otpExpiresAt_idx" ON "users"("otpExpiresAt");

-- AddForeignKey
ALTER TABLE "ltd_accounts_workflows" ADD CONSTRAINT "ltd_accounts_workflows_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ltd_accounts_workflows" ADD CONSTRAINT "ltd_accounts_workflows_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ltd_accounts_workflow_history" ADD CONSTRAINT "ltd_accounts_workflow_history_ltdAccountsWorkflowId_fkey" FOREIGN KEY ("ltdAccountsWorkflowId") REFERENCES "ltd_accounts_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ltd_accounts_workflow_history" ADD CONSTRAINT "ltd_accounts_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
