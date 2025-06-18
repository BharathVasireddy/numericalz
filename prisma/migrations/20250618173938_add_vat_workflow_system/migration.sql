/*
  Warnings:

  - You are about to drop the column `vatQuarters` on the `clients` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VATWorkflowStage" AS ENUM ('CLIENT_BOOKKEEPING', 'WORK_IN_PROGRESS', 'QUERIES_PENDING', 'REVIEW_PENDING_MANAGER', 'REVIEW_PENDING_PARTNER', 'EMAILED_TO_PARTNER', 'EMAILED_TO_CLIENT', 'CLIENT_APPROVED', 'FILED_TO_HMRC');

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "vatQuarters";

-- CreateTable
CREATE TABLE "vat_quarters" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quarterPeriod" TEXT NOT NULL,
    "quarterStartDate" TIMESTAMP(3) NOT NULL,
    "quarterEndDate" TIMESTAMP(3) NOT NULL,
    "filingDueDate" TIMESTAMP(3) NOT NULL,
    "quarterGroup" TEXT NOT NULL,
    "currentStage" "VATWorkflowStage" NOT NULL DEFAULT 'CLIENT_BOOKKEEPING',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "assignedUserId" TEXT,
    "chaseStartedDate" TIMESTAMP(3),
    "chaseStartedByUserId" TEXT,
    "chaseStartedByUserName" TEXT,
    "paperworkReceivedDate" TIMESTAMP(3),
    "paperworkReceivedByUserId" TEXT,
    "paperworkReceivedByUserName" TEXT,
    "workStartedDate" TIMESTAMP(3),
    "workStartedByUserId" TEXT,
    "workStartedByUserName" TEXT,
    "workFinishedDate" TIMESTAMP(3),
    "workFinishedByUserId" TEXT,
    "workFinishedByUserName" TEXT,
    "sentToClientDate" TIMESTAMP(3),
    "sentToClientByUserId" TEXT,
    "sentToClientByUserName" TEXT,
    "clientApprovedDate" TIMESTAMP(3),
    "clientApprovedByUserId" TEXT,
    "clientApprovedByUserName" TEXT,
    "filedToHMRCDate" TIMESTAMP(3),
    "filedToHMRCByUserId" TEXT,
    "filedToHMRCByUserName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_quarters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_workflow_history" (
    "id" TEXT NOT NULL,
    "vatQuarterId" TEXT NOT NULL,
    "fromStage" "VATWorkflowStage",
    "toStage" "VATWorkflowStage" NOT NULL,
    "stageChangedAt" TIMESTAMP(3) NOT NULL,
    "daysInPreviousStage" INTEGER,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vat_quarters_clientId_quarterPeriod_key" ON "vat_quarters"("clientId", "quarterPeriod");

-- AddForeignKey
ALTER TABLE "vat_quarters" ADD CONSTRAINT "vat_quarters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_quarters" ADD CONSTRAINT "vat_quarters_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_workflow_history" ADD CONSTRAINT "vat_workflow_history_vatQuarterId_fkey" FOREIGN KEY ("vatQuarterId") REFERENCES "vat_quarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_workflow_history" ADD CONSTRAINT "vat_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
