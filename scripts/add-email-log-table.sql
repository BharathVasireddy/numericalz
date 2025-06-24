-- Add EmailStatus enum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- Create email_logs table
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

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
CREATE INDEX "email_logs_emailType_idx" ON "email_logs"("emailType");
CREATE INDEX "email_logs_clientId_idx" ON "email_logs"("clientId");
CREATE INDEX "email_logs_triggeredBy_idx" ON "email_logs"("triggeredBy");
CREATE INDEX "email_logs_createdAt_idx" ON "email_logs"("createdAt");
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt"); 