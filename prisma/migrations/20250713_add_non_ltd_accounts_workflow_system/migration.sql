-- CreateEnum
CREATE TYPE "NonLtdAccountsWorkflowStage" AS ENUM (
  'WAITING_FOR_YEAR_END',
  'PAPERWORK_PENDING_CHASE',
  'PAPERWORK_CHASED',
  'PAPERWORK_RECEIVED',
  'WORK_IN_PROGRESS',
  'DISCUSS_WITH_MANAGER',
  'REVIEW_BY_PARTNER',
  'REVIEW_DONE_HELLO_SIGN',
  'SENT_TO_CLIENT_HELLO_SIGN',
  'APPROVED_BY_CLIENT',
  'SUBMISSION_APPROVED_PARTNER',
  'FILED_TO_HMRC',
  'CLIENT_SELF_FILING',
  'REVIEWED_BY_MANAGER',
  'REVIEWED_BY_PARTNER'
);

-- CreateTable
CREATE TABLE "non_ltd_accounts_workflows" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "yearEndDate" TIMESTAMP(3) NOT NULL,
    "filingDueDate" TIMESTAMP(3) NOT NULL,
    "currentStage" "NonLtdAccountsWorkflowStage" NOT NULL DEFAULT 'PAPERWORK_PENDING_CHASE',
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
    "filedToHMRCDate" TIMESTAMP(3),
    "filedToHMRCByUserId" TEXT,
    "filedToHMRCByUserName" TEXT,
    CONSTRAINT "non_ltd_accounts_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_ltd_accounts_workflow_history" (
    "id" TEXT NOT NULL,
    "nonLtdAccountsWorkflowId" TEXT NOT NULL,
    "fromStage" "NonLtdAccountsWorkflowStage",
    "toStage" "NonLtdAccountsWorkflowStage" NOT NULL,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daysInPreviousStage" INTEGER,
    CONSTRAINT "non_ltd_accounts_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "non_ltd_accounts_workflows_assignedUserId_idx" ON "non_ltd_accounts_workflows"("assignedUserId");
CREATE INDEX "non_ltd_accounts_workflows_clientId_idx" ON "non_ltd_accounts_workflows"("clientId");
CREATE INDEX "non_ltd_accounts_workflows_currentStage_idx" ON "non_ltd_accounts_workflows"("currentStage");
CREATE INDEX "non_ltd_accounts_workflows_yearEndDate_idx" ON "non_ltd_accounts_workflows"("yearEndDate");
CREATE INDEX "non_ltd_accounts_workflow_history_nonLtdAccountsWorkflowId_idx" ON "non_ltd_accounts_workflow_history"("nonLtdAccountsWorkflowId");

-- AddForeignKey
ALTER TABLE "non_ltd_accounts_workflows" ADD CONSTRAINT "non_ltd_accounts_workflows_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "non_ltd_accounts_workflows" ADD CONSTRAINT "non_ltd_accounts_workflows_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_ltd_accounts_workflow_history" ADD CONSTRAINT "non_ltd_accounts_workflow_history_nonLtdAccountsWorkflowId_fkey" FOREIGN KEY ("nonLtdAccountsWorkflowId") REFERENCES "non_ltd_accounts_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_ltd_accounts_workflow_history" ADD CONSTRAINT "non_ltd_accounts_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 