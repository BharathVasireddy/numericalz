# 🛡️ Backup & Recovery Guide

## Overview

This guide covers the comprehensive backup and recovery system implemented for the Numericalz Internal Management System to prevent data loss and ensure business continuity.

## 🚨 Emergency Recovery

### If You've Lost Data:

1. **Stop all operations immediately**
2. **Don't run any more migrations or seeds**
3. **Check for available backups**
4. **Follow the restoration process below**

## 📦 Backup System

### Automated Backups

The system creates automatic backups:
- **Daily**: Every day at 2:00 AM UK time
- **Frequent**: Every 6 hours for critical systems
- **Pre-Migration**: Before every database migration
- **Post-Migration**: After successful migrations

### Manual Backup

Create an immediate backup:
```bash
npm run db:backup
```

### Backup Contents

Each backup includes:
- Users and user settings
- Clients and client data
- Communications and email templates
- Notifications and activity logs
- System settings

### Backup Location

Backups are stored in:
```
/backups/backup-YYYY-MM-DDTHH-mm-ss-sssZ.json
```

## 🔄 Recovery Process

### 1. List Available Backups

```bash
ls -la backups/
```

### 2. Restore from Backup

```bash
npm run db:restore backups/backup-2024-06-18T10-30-00-000Z.json
```

### 3. Verify Restoration

```bash
node check-users.js
```

## 🛡️ Safe Migration Process

### Always Use Safe Migrations

Instead of running `prisma migrate` directly, use:
```bash
npm run db:migrate-safe
```

This process:
1. Creates pre-migration backup
2. Validates schema
3. Runs migration
4. Creates post-migration backup
5. Provides rollback options

### Migration Rollback

If a migration fails:
1. The pre-migration backup is automatically created
2. Restore using: `npm run db:restore backups/backup-[timestamp].json`

## 📅 Backup Scheduling

### Start Automated Backups

For production environments:
```bash
npm run db:backup-schedule
```

This runs continuously and creates:
- Daily backups at 2:00 AM UK time
- Frequent backups every 6 hours

### Production Deployment

Add to your process manager (PM2, Docker, etc.):
```bash
pm2 start "npm run db:backup-schedule" --name "backup-scheduler"
```

## 🔍 Backup Verification

### Check Backup Integrity

```bash
node -e "
const backup = require('./backups/backup-[timestamp].json');
console.log('Backup from:', backup.timestamp);
console.log('Users:', backup.data.users.length);
console.log('Clients:', backup.data.clients.length);
"
```

### Verify Current Data

```bash
node check-users.js
node emergency-recovery.js
```

## 🚨 Emergency Procedures

### Data Loss Incident Response

1. **Immediate Actions:**
   - Stop all application instances
   - Document what happened
   - Identify the last known good state

2. **Assessment:**
   - Check available backups
   - Determine scope of data loss
   - Estimate recovery time

3. **Recovery:**
   - Select appropriate backup
   - Run restoration process
   - Verify data integrity
   - Resume operations

4. **Post-Incident:**
   - Document lessons learned
   - Improve backup frequency if needed
   - Update recovery procedures

## 🔐 Security Considerations

### Backup Security

- Backups contain sensitive data
- Store in secure, encrypted locations
- Limit access to authorized personnel
- Regular security audits

### Access Control

- Only authorized users can create/restore backups
- Log all backup and restore operations
- Monitor for unauthorized access

## 📊 Monitoring & Alerts

### Backup Monitoring

Monitor backup processes:
- Backup creation success/failure
- Backup file sizes and integrity
- Storage space availability
- Backup age and retention

### Recommended Alerts

Set up alerts for:
- Backup failures
- Missing daily backups
- Storage space low
- Backup file corruption

## 🔧 Maintenance

### Regular Tasks

**Weekly:**
- Verify backup integrity
- Test restoration process
- Clean up old backups (automated)

**Monthly:**
- Full recovery test
- Review backup retention policy
- Update documentation

**Quarterly:**
- Disaster recovery drill
- Review and update procedures
- Capacity planning

### Backup Retention

- **Hourly backups**: Keep for 7 days
- **Daily backups**: Keep for 30 days
- **Weekly backups**: Keep for 3 months
- **Monthly backups**: Keep for 1 year

## 🚀 Best Practices

### Development

1. **Always backup before migrations**
2. **Test migrations on staging first**
3. **Use safe migration commands**
4. **Document all schema changes**

### Production

1. **Multiple backup locations**
2. **Regular recovery testing**
3. **Automated monitoring**
4. **Incident response plan**

### Operations

1. **Regular backup verification**
2. **Capacity monitoring**
3. **Security audits**
4. **Staff training**

## 📞 Emergency Contacts

In case of critical data loss:
1. Stop all operations
2. Contact system administrator
3. Document the incident
4. Follow recovery procedures

## 🔄 Recovery Testing

### Monthly Recovery Test

```bash
# 1. Create test backup
npm run db:backup

# 2. Note current data state
node check-users.js > before-test.txt

# 3. Restore from backup
npm run db:restore backups/backup-[timestamp].json

# 4. Verify restoration
node check-users.js > after-test.txt

# 5. Compare results
diff before-test.txt after-test.txt
```

## 📝 Troubleshooting

### Common Issues

**Backup fails:**
- Check disk space
- Verify database connection
- Check file permissions

**Restoration fails:**
- Verify backup file integrity
- Check database connection
- Ensure sufficient privileges

**Migration issues:**
- Use safe migration process
- Check schema compatibility
- Verify foreign key constraints

## 📋 Checklist

### Before Any Major Operation

- [ ] Current backup exists
- [ ] Backup verified and tested
- [ ] Migration plan documented
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Monitoring in place

### After Any Major Operation

- [ ] Operation completed successfully
- [ ] New backup created
- [ ] Data integrity verified
- [ ] Monitoring shows normal operation
- [ ] Documentation updated
- [ ] Team notified of completion

---

**Remember**: The best backup is the one you never need, but when you do need it, it works perfectly. Regular testing and maintenance of your backup system is crucial for business continuity. 