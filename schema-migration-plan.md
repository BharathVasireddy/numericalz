# Production Schema Migration Plan

## 🎯 Current Schema Drift Issues

### Problems Identified:
1. **Email History API**: Code expects `templateId` field that doesn't exist in production
2. **VAT Assignment Fields**: Production has `vatAssignedUserId` field that code no longer uses
3. **Email Templates**: Schema mismatch between backup (`content`) and production (`htmlContent`)

## 📋 Migration Strategy

### Phase 1: IMMEDIATE SAFETY (Deploy Code First) ✅ SAFE
**Goal**: Fix email history functionality without breaking production

**Why Safe**:
- Removing code references to existing DB fields is safe
- Fields remain in DB but unused (no breaking changes)
- Email history will work immediately

**Actions**:
1. ✅ Deploy current code fix (removes template include)
2. ✅ Verify email history shows 664 emails
3. ✅ Monitor for any issues

### Phase 2: SCHEMA CLEANUP (After Code Deploy)
**Goal**: Remove unused fields and fix schema issues

**Migrations Needed**:
1. **Remove VAT Assignment Fields**: Drop `vatAssignedUserId` from clients table
2. **Email Template Fix**: Create template with correct schema
3. **General Cleanup**: Remove any other orphaned fields

### Phase 3: SCHEMA SYNC STRATEGY (Ongoing)
**Goal**: Prevent future schema drift

**Process**:
1. **Local Development**: Use migrations for all schema changes
2. **Staging Environment**: Test migrations before production
3. **Production Deploy**: Always migrate schema BEFORE deploying code that uses it
4. **Rollback Plan**: Every migration should have a rollback script

## 🛠️ Migration Scripts

### Migration 1: Remove VAT Assignment Field
```sql
-- Remove unused VAT assignment field from clients table
ALTER TABLE clients DROP COLUMN IF EXISTS "vatAssignedUserId";

-- Verify no references remain
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name LIKE '%vat%';
```

### Migration 2: Create Email Template
```sql
-- Create email template with correct schema
INSERT INTO email_templates (
  id, name, subject, htmlContent, textContent, isActive, createdAt, updatedAt
) VALUES (
  'template-001',
  'VAT Paperwork Request', 
  'VAT Paperwork Request',
  '<p>VAT paperwork request content</p>',
  'VAT paperwork request content',
  true,
  NOW(),
  NOW()
);
```

## ⚠️ Safety Checklist

### Before Any Migration:
- [ ] Backup production database
- [ ] Test migration on staging copy
- [ ] Verify no active code references
- [ ] Plan rollback procedure
- [ ] Schedule maintenance window

### After Migration:
- [ ] Verify application functionality
- [ ] Check all API endpoints
- [ ] Monitor error logs
- [ ] Test key user workflows

## 📅 Execution Timeline

### Step 1: Deploy Code Fix (NOW) - 5 minutes
- Deploy current commit to production
- Verify email history works
- No database changes needed

### Step 2: Schema Cleanup (Later Today) - 30 minutes
- Create backup
- Run VAT field cleanup migration
- Create email template
- Verify functionality

### Step 3: Long-term Strategy (This Week)
- Set up staging environment with production copy
- Create formal migration process
- Document schema change procedures

## 🔄 Future Schema Change Process

### The Right Way:
1. **Code Change** → **Test Locally** → **Create Migration** → **Test on Staging**
2. **Deploy Migration to Production** → **Deploy Code to Production**
3. **Verify** → **Monitor** → **Document**

### Never Do:
- Deploy code expecting DB fields that don't exist
- Change schema without corresponding code changes
- Skip staging testing
- Forget backup before migrations 