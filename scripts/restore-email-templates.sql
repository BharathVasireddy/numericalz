-- 🔄 RESTORE EMAIL TEMPLATES FROM BACKUP
-- Date: 2025-07-08
-- Source: backup-2025-07-07T11-36-07-767Z.json
-- Purpose: Restore email templates that were lost during schema changes

-- Begin transaction for atomic operation
BEGIN;

-- Insert the "Testing" email template from backup
INSERT INTO email_templates (
    id,
    name,
    subject,
    htmlContent,
    textContent,
    variables,
    category,
    isActive,
    isSystem,
    createdBy,
    description,
    createdAt,
    updatedAt
) VALUES (
    'cmcp1n8q1000545jo244k8f5x',
    'Testing',
    'Testing Mail.',
    '<p>Hello {{client.contactName}}</p><p></p><p>This is a testing mail for {{client.companyName}}</p><p></p><p>Thank You </p>',
    NULL,
    '["{{client.companyName}}","{{client.contactName}}","{{client.contactEmail}}","{{user.name}}","{{user.email}}","{{currentDate}}","{{quarterPeriod}}","{{filingDueDate}}"]',
    'GENERAL',
    true,
    false,
    'cmcnpf2u80000vs7b3a1s03i5',
    '',
    '2025-07-04T16:43:36.553Z'::timestamp,
    '2025-07-04T17:08:44.642Z'::timestamp
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    htmlContent = EXCLUDED.htmlContent,
    textContent = EXCLUDED.textContent,
    variables = EXCLUDED.variables,
    category = EXCLUDED.category,
    isActive = EXCLUDED.isActive,
    isSystem = EXCLUDED.isSystem,
    createdBy = EXCLUDED.createdBy,
    description = EXCLUDED.description,
    updatedAt = EXCLUDED.updatedAt;

-- Verify the template was restored
SELECT 
    id, 
    name, 
    subject, 
    category,
    isActive,
    createdAt
FROM email_templates 
WHERE id = 'cmcp1n8q1000545jo244k8f5x';

-- Commit the transaction
COMMIT;

-- Success message
SELECT 'SUCCESS: Email template restored from backup' as result; 