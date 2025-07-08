-- 🛡️ SAFE PRODUCTION MIGRATION: Add Template Fields to email_logs
-- Date: 2025-07-08
-- Purpose: Add templateId and templateData columns to email_logs table
-- 
-- SAFETY MEASURES:
-- 1. Only ADD COLUMN operations (no data loss)
-- 2. All columns are nullable (no constraint violations)
-- 3. Can be rolled back with DROP COLUMN if needed
-- 4. No existing data affected

-- Begin transaction for atomic operation
BEGIN;

-- Add templateId column (nullable string, references email_templates.id)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS "templateId" TEXT;

-- Add templateData column (nullable string for JSON data)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS "templateData" TEXT;

-- Add index for templateId for better query performance
CREATE INDEX IF NOT EXISTS "email_logs_templateId_idx" ON email_logs("templateId");

-- Add foreign key constraint to email_templates table
ALTER TABLE email_logs ADD CONSTRAINT "email_logs_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES email_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'email_logs' AND table_schema = 'public' 
AND column_name IN ('templateId', 'templateData')
ORDER BY column_name;

-- Commit the transaction
COMMIT;

-- Success message
SELECT 'SUCCESS: Template fields added to email_logs table' as result; 