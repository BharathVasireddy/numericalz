-- 🚨 ROLLBACK SCRIPT: Remove Template Fields from email_logs
-- Date: 2025-07-08
-- Purpose: Emergency rollback for template field migration
-- 
-- WARNING: This will remove the templateId and templateData columns
-- Use only if the migration causes issues

-- Begin transaction for atomic operation
BEGIN;

-- Remove foreign key constraint first
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS "email_logs_templateId_fkey";

-- Remove index
DROP INDEX IF EXISTS "email_logs_templateId_idx";

-- Remove templateData column
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateData";

-- Remove templateId column
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateId";

-- Verify the columns were removed successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'email_logs' AND table_schema = 'public' 
AND column_name IN ('templateId', 'templateData')
ORDER BY column_name;

-- Commit the transaction
COMMIT;

-- Success message
SELECT 'SUCCESS: Template fields removed from email_logs table' as result; 