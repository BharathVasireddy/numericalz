# Template Migration Guide - Production Database

## 🎯 Overview

This guide provides step-by-step instructions for safely adding email template support to the production database. The migration adds `templateId` and `templateData` columns to the `email_logs` table to enable comprehensive email logging with template tracking.

## 🛡️ Safety Features

- **Complete Production Backup**: Full schema + data backup with verification
- **SQL-Only Approach**: Avoids Prisma migration drift issues  
- **Zero Data Loss**: Uses safe `ADD COLUMN` operations only
- **Rollback Plan**: Includes complete rollback instructions
- **Verification**: Multiple verification steps throughout the process

## 📋 Prerequisites

1. **Production Access**: Ensure you have production database credentials
2. **Environment Variables**: Set `DATABASE_URL_PRODUCTION` or `DATABASE_URL`
3. **Local Testing**: Test migration on development database first
4. **Backup Storage**: Ensure sufficient disk space for production backups

## 🚀 Migration Process

### Phase 1: Local Testing (MANDATORY)

```bash
# Test the migration on local development database
npm run migration:test-local
```

**Expected Output:**
- ✅ migration_log table created/verified
- ✅ Local database backup created
- ✅ Migration SQL executed successfully
- ✅ Columns added: templateId, templateData
- ✅ Index created: EmailLog_templateId_idx
- ✅ Foreign key constraint added (if email_templates exists)
- ✅ Test email insertion with template fields
- ✅ Migration verified and ready for production

### Phase 2: Production Backup (CRITICAL)

```bash
# Create complete production backup with verification
npm run migration:production-backup
```

**Expected Output:**
- 📋 Schema backup: production-schema-[timestamp].sql
- 💾 Data backup: production-data-[timestamp].sql  
- 🔗 Complete backup: production-complete-[timestamp].sql
- 📄 Verification data: verification-[timestamp].json
- ✅ All backup files verified and cross-checked with production

### Phase 3: Production Migration (SAFE EXECUTION)

```bash
# Apply migration to production safely
npm run migration:production-safe
```

**Expected Output:**
- 🔒 Production backup created and verified
- 📋 migration_log table ensured
- ⚡ Migration SQL executed on production
- 📊 Migration verification completed
- 🧪 Email logging functionality tested
- 🎉 Production migration completed successfully

## 📁 Files Created

### Migration Scripts
- `scripts/migrate-add-template-fields.sql` - Core migration SQL
- `scripts/test-migration-local.js` - Local testing script
- `scripts/backup-production-complete.js` - Production backup script
- `scripts/migrate-production-safely.js` - Safe production migration

### Email Service
- `lib/email-service-with-templates.ts` - Template-enabled service (activate after migration)

### Backup Files
- `production-backups/production-schema-[timestamp].sql`
- `production-backups/production-data-[timestamp].sql`
- `production-backups/production-complete-[timestamp].sql`
- `production-backups/verification-[timestamp].json`

## 🔄 Activation Process (After Migration)

1. **Verify Migration Success**: Ensure all verification steps passed
2. **Backup Current Service**: 
   ```bash
   mv lib/email-service.ts lib/email-service-no-templates.ts
   ```
3. **Activate Template Service**:
   ```bash
   mv lib/email-service-with-templates.ts lib/email-service.ts
   ```
4. **Deploy to Production**: Push changes to Vercel
5. **Test Complete Functionality**: Verify OTP emails and templates are logged

## 🚨 Rollback Plan

If migration needs to be undone:

```sql
-- Connect to production database and run:
BEGIN;

-- Remove foreign key constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS "EmailLog_templateId_fkey";

-- Remove index  
DROP INDEX IF EXISTS "EmailLog_templateId_idx";

-- Remove columns (SAFE - no data loss if columns are empty)
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateData";
ALTER TABLE email_logs DROP COLUMN IF EXISTS "templateId";

-- Record rollback
INSERT INTO migration_log (migration_name, started_at, status) 
VALUES ('rollback_add_email_template_fields', NOW(), 'ROLLBACK_COMPLETED');

COMMIT;
```

## ✅ Expected Benefits

### Before Migration
- ❌ OTP emails bypass email logging
- ❌ Template data not tracked
- ❌ Incomplete email audit trail
- ❌ Schema compatibility issues

### After Migration  
- ✅ **Complete Email Logging**: ALL system emails logged
- ✅ **Template Tracking**: Full template usage analytics
- ✅ **OTP Email Logging**: Authentication emails in history
- ✅ **Template Data**: Variable data preserved for audit
- ✅ **Schema Compatibility**: Production matches development

## 📊 Verification Checklist

### Pre-Migration
- [ ] Local migration test successful
- [ ] Production backup created and verified
- [ ] Backup files contain expected data
- [ ] Migration SQL reviewed for safety

### Post-Migration
- [ ] templateId column exists (TEXT, nullable)
- [ ] templateData column exists (TEXT, nullable)  
- [ ] EmailLog_templateId_idx index created
- [ ] Foreign key constraint added (if applicable)
- [ ] Migration logged in migration_log table
- [ ] Test email insertion successful
- [ ] Email service can use template fields

### Post-Activation
- [ ] OTP emails appear in email history
- [ ] Template emails logged with template data
- [ ] Email filters include template types
- [ ] No schema compatibility errors
- [ ] Email statistics include template usage

## 🔧 Troubleshooting

### Common Issues

**Issue**: "templateId column does not exist"
**Solution**: Migration not complete - run verification script

**Issue**: "Migration failed with constraint error"  
**Solution**: Check if email_templates table exists, foreign key is optional

**Issue**: "Backup file is empty"
**Solution**: Check database connection and permissions

**Issue**: "Test email insertion failed"
**Solution**: Verify users table has data, adjust test query

### Support
For issues during migration:
1. Check backup files in `production-backups/` directory
2. Review migration logs and error messages
3. Use rollback SQL if necessary
4. Contact system administrator if data integrity concerns

---

## 🏁 Summary

This migration safely adds template support to email logging while maintaining zero data loss and complete rollback capability. The multi-phase approach ensures production safety through comprehensive testing and verification.

**Total Time**: ~15-30 minutes
**Risk Level**: Very Low (safe operations only)
**Rollback Time**: ~5 minutes
**Benefits**: Complete email audit trail with template tracking 