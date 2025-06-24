-- Add fromEmail and fromName fields to email_logs table
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "fromEmail" TEXT DEFAULT 'noreply@numericalz.com';
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "fromName" TEXT DEFAULT 'Numericalz';

-- Update existing records to have default values
UPDATE "email_logs" SET "fromEmail" = 'noreply@numericalz.com' WHERE "fromEmail" IS NULL;
UPDATE "email_logs" SET "fromName" = 'Numericalz' WHERE "fromName" IS NULL; 