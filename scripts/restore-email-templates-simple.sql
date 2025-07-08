-- 🔄 RESTORE EMAIL TEMPLATES FROM BACKUP (SIMPLIFIED)
-- Date: 2025-07-08
-- Purpose: Restore email templates using only existing columns in production

-- Begin transaction for atomic operation
BEGIN;

-- Insert the "Testing" email template from backup
-- Using only columns that exist in production: id, name, subject, htmlContent, textContent, variables, isActive, createdAt, updatedAt
INSERT INTO email_templates (
    id,
    name,
    subject,
    htmlContent,
    textContent,
    variables,
    isActive,
    createdAt,
    updatedAt
) VALUES (
    'cmcp1n8q1000545jo244k8f5x',
    'Testing',
    'Testing Mail.',
    '<p>Hello {{client.contactName}}</p><p></p><p>This is a testing mail for {{client.companyName}}</p><p></p><p>Thank You </p>',
    NULL,
    '["{{client.companyName}}","{{client.contactName}}","{{client.contactEmail}}","{{user.name}}","{{user.email}}","{{currentDate}}","{{quarterPeriod}}","{{filingDueDate}}"]',
    true,
    '2025-07-04T16:43:36.553Z'::timestamp,
    '2025-07-04T17:08:44.642Z'::timestamp
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    htmlContent = EXCLUDED.htmlContent,
    textContent = EXCLUDED.textContent,
    variables = EXCLUDED.variables,
    isActive = EXCLUDED.isActive,
    updatedAt = EXCLUDED.updatedAt;

-- Verify the template was restored
SELECT 
    id, 
    name, 
    subject, 
    isActive,
    createdAt
FROM email_templates 
WHERE id = 'cmcp1n8q1000545jo244k8f5x';

-- Commit the transaction
COMMIT;

-- Success message
SELECT 'SUCCESS: Email template restored from backup using existing columns' as result; 