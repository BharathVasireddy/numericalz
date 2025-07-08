-- =============================================================================
-- SAFE PRODUCTION MIGRATION: Add Email Template Support to email_logs table
-- =============================================================================
-- 
-- This script safely adds templateId and templateData columns to the 
-- production email_logs table using PostgreSQL-native SQL commands.
-- 
-- SAFETY FEATURES:
-- ✅ Uses ALTER TABLE ADD COLUMN (safe, no data loss)
-- ✅ Adds columns as optional (nullable)
-- ✅ Uses IF NOT EXISTS where supported
-- ✅ Includes rollback commands
-- ✅ No destructive operations
-- 
-- BEFORE RUNNING:
-- 1. Ensure complete production backup is created and verified
-- 2. Test on development database first
-- 3. Run during low-traffic period
-- 4. Have rollback plan ready
-- 
-- =============================================================================

BEGIN;

-- Record migration start
INSERT INTO migration_log (migration_name, started_at, status) 
VALUES ('add_email_template_fields', NOW(), 'STARTED')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 1: Add templateId column (Foreign Key to email_templates)
-- =============================================================================

DO $$ 
BEGIN 
    -- Check if templateId column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' 
        AND column_name = 'templateId'
        AND table_schema = 'public'
    ) THEN
        -- Add templateId column as nullable string
        ALTER TABLE email_logs ADD COLUMN "templateId" TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN email_logs."templateId" IS 'Reference to EmailTemplate.id when email was sent using a template';
        
        RAISE NOTICE 'Added templateId column to email_logs table';
    ELSE
        RAISE NOTICE 'templateId column already exists in email_logs table';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Add templateData column (JSON data for template variables)
-- =============================================================================

DO $$ 
BEGIN 
    -- Check if templateData column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' 
        AND column_name = 'templateData'
        AND table_schema = 'public'
    ) THEN
        -- Add templateData column as nullable text (JSON string)
        ALTER TABLE email_logs ADD COLUMN "templateData" TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN email_logs."templateData" IS 'JSON string containing variable data used to populate template';
        
        RAISE NOTICE 'Added templateData column to email_logs table';
    ELSE
        RAISE NOTICE 'templateData column already exists in email_logs table';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Add index on templateId for performance
-- =============================================================================

DO $$ 
BEGIN 
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'email_logs' 
        AND indexname = 'EmailLog_templateId_idx'
        AND schemaname = 'public'
    ) THEN
        -- Create index for templateId lookups
        CREATE INDEX "EmailLog_templateId_idx" ON email_logs("templateId");
        
        RAISE NOTICE 'Created index EmailLog_templateId_idx on email_logs.templateId';
    ELSE
        RAISE NOTICE 'Index EmailLog_templateId_idx already exists';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Add foreign key constraint (if email_templates table exists)
-- =============================================================================

DO $$ 
BEGIN 
    -- Check if email_templates table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'email_templates'
        AND table_schema = 'public'
    ) THEN
        -- Check if foreign key constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'email_logs'
            AND constraint_name = 'EmailLog_templateId_fkey'
            AND table_schema = 'public'
        ) THEN
            -- Add foreign key constraint with CASCADE DELETE SET NULL
            ALTER TABLE email_logs 
            ADD CONSTRAINT "EmailLog_templateId_fkey" 
            FOREIGN KEY ("templateId") REFERENCES email_templates(id) 
            ON DELETE SET NULL ON UPDATE CASCADE;
            
            RAISE NOTICE 'Added foreign key constraint EmailLog_templateId_fkey';
        ELSE
            RAISE NOTICE 'Foreign key constraint EmailLog_templateId_fkey already exists';
        END IF;
    ELSE
        RAISE NOTICE 'email_templates table does not exist, skipping foreign key constraint';
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Verify migration success
-- =============================================================================

DO $$ 
DECLARE 
    template_id_exists BOOLEAN;
    template_data_exists BOOLEAN;
    index_exists BOOLEAN;
    fk_exists BOOLEAN;
BEGIN 
    -- Check if columns were added successfully
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'templateId'
    ) INTO template_id_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = 'templateData'
    ) INTO template_data_exists;
    
    -- Check if index was created
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'email_logs' AND indexname = 'EmailLog_templateId_idx'
    ) INTO index_exists;
    
    -- Check if foreign key was created (if applicable)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'email_logs' AND constraint_name = 'EmailLog_templateId_fkey'
    ) INTO fk_exists;
    
    -- Verify results
    IF template_id_exists AND template_data_exists AND index_exists THEN
        RAISE NOTICE '✅ MIGRATION SUCCESSFUL: All components added successfully';
        RAISE NOTICE '   ✅ templateId column: %', template_id_exists;
        RAISE NOTICE '   ✅ templateData column: %', template_data_exists;
        RAISE NOTICE '   ✅ Index created: %', index_exists;
        RAISE NOTICE '   ✅ Foreign key: %', fk_exists;
    ELSE
        RAISE EXCEPTION '❌ MIGRATION FAILED: Missing components - templateId: %, templateData: %, index: %, fk: %', 
                       template_id_exists, template_data_exists, index_exists, fk_exists;
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Record migration completion
-- =============================================================================

UPDATE migration_log 
SET completed_at = NOW(), status = 'COMPLETED'
WHERE migration_name = 'add_email_template_fields' 
AND status = 'STARTED';

-- =============================================================================
-- STEP 7: Show final table structure
-- =============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
AND table_schema = 'public'
AND column_name IN ('templateId', 'templateData')
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'email_logs' 
AND indexname LIKE '%template%'
AND schemaname = 'public';

-- Show constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'email_logs' 
AND constraint_name LIKE '%template%'
AND table_schema = 'public';

COMMIT;

-- =============================================================================
-- ROLLBACK SCRIPT (Run only if migration needs to be undone)
-- =============================================================================
/*
BEGIN;

-- Remove foreign key constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS "EmailLog_templateId_fkey";

-- Remove index
DROP INDEX IF EXISTS "EmailLog_templateId_idx";

-- Remove columns
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateData";
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateId";

-- Record rollback
INSERT INTO migration_log (migration_name, started_at, status) 
VALUES ('rollback_add_email_template_fields', NOW(), 'ROLLBACK_COMPLETED');

COMMIT;
*/ 