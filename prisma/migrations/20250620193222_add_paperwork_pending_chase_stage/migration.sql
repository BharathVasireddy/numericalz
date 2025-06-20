-- CreateEnum
-- Add new enum value safely
ALTER TYPE "VATWorkflowStage" ADD VALUE IF NOT EXISTS 'PAPERWORK_PENDING_CHASE';

-- Update the default value for new records (optional, can be done in application logic)
-- ALTER TABLE "vat_quarters" ALTER COLUMN "currentStage" SET DEFAULT 'PAPERWORK_PENDING_CHASE';
