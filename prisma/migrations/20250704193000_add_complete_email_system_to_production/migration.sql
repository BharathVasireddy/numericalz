-- Migration: Add complete email communication system to production
-- This migration adds all missing components for the email system:
-- 1. TemplateCategory enum
-- 2. Additional fields to email_templates table
-- 3. EmailAttachment model
-- 4. BrandingSettings model
-- 5. Template relationships to email_logs

-- Create TemplateCategory enum
CREATE TYPE "TemplateCategory" AS ENUM ('GENERAL', 'VAT_WORKFLOW', 'ACCOUNTS_WORKFLOW', 'CHASE_REMINDERS', 'DEADLINE_NOTIFICATIONS', 'COMPLETION_NOTIFICATIONS', 'QUERY_REQUESTS', 'APPROVAL_REQUESTS', 'FILING_CONFIRMATIONS', 'WELCOME_ONBOARDING', 'MARKETING', 'SYSTEM_NOTIFICATIONS');

-- Add missing fields to email_templates table
ALTER TABLE "email_templates" ADD COLUMN "category" "TemplateCategory" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "email_templates" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_templates" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "email_templates" ADD COLUMN "description" TEXT;

-- Add indexes for new email_templates fields
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");
CREATE INDEX "email_templates_isActive_idx" ON "email_templates"("isActive");
CREATE INDEX "email_templates_isSystem_idx" ON "email_templates"("isSystem");
CREATE INDEX "email_templates_createdBy_idx" ON "email_templates"("createdBy");

-- Create EmailAttachment model
CREATE TABLE "email_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateId" TEXT,
    "emailLogId" TEXT,

    CONSTRAINT "email_attachments_pkey" PRIMARY KEY ("id")
);

-- Add indexes for email_attachments
CREATE INDEX "email_attachments_templateId_idx" ON "email_attachments"("templateId");
CREATE INDEX "email_attachments_emailLogId_idx" ON "email_attachments"("emailLogId");

-- Create BrandingSettings model
CREATE TABLE "branding_settings" (
    "id" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#64748b',
    "emailSignature" TEXT,
    "websiteUrl" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_settings_pkey" PRIMARY KEY ("id")
);

-- Add template support fields to email_logs
ALTER TABLE "email_logs" ADD COLUMN "templateId" TEXT;
ALTER TABLE "email_logs" ADD COLUMN "templateData" TEXT;

-- Add index for templateId in email_logs
CREATE INDEX "email_logs_templateId_idx" ON "email_logs"("templateId");

-- Add foreign key constraints
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "email_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE; 