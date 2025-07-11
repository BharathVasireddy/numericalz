# VAT Quarter Auto-Creation System

## 🎯 Overview

This system automatically creates VAT quarters for clients on the 1st of each month at 12:00 AM (midnight) using **GitHub Actions** and **Vercel hosting**.

### **How It Works**

1. **GitHub Actions** runs on the 1st of every month
2. Triggers your Vercel-hosted API endpoint
3. Creates VAT quarters for clients whose quarters ended the previous day
4. Assigns to the previously assigned user (if any)
5. Sends email notifications to assigned users

### **Example Workflow**

For a client with `3,6,9,12` quarters:
- **June 30**: Quarter ends
- **July 1**: GitHub Actions runs at 12:00 AM
- **July 1**: Creates the Apr-Jun quarter in database
- **July 1**: Assigns to previous user (if any)
- **July 1**: Sends assignment email

## 🚀 Setup Instructions

### **Step 1: Add Environment Variables**

Add this to your `.env.local` and `.env.production`:

```bash
# VAT Automation Secret (for GitHub Actions)
VAT_AUTO_CREATE_SECRET="your-super-secret-key-here"
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### **Step 2: Configure Vercel Environment Variables**

In your Vercel dashboard:

1. Go to your project settings
2. Click "Environment Variables"
3. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VAT_AUTO_CREATE_SECRET` | `your-generated-secret` | Production |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |

### **Step 3: Configure GitHub Secrets**

In your GitHub repository:

1. Go to **Settings → Secrets and Variables → Actions**
2. Add these **Repository Secrets**:

| Secret Name | Value |
|-------------|-------|
| `VAT_AUTO_CREATE_SECRET` | Same secret as in Vercel |
| `VERCEL_APP_URL` | `https://your-app.vercel.app` |

### **Step 4: Test the Setup**

#### **Manual Testing**

1. Navigate to: `https://your-app.vercel.app/api/vat-quarters/auto-create`
2. Add Authorization header: `Bearer your-secret-here`
3. Should return success response

#### **GitHub Actions Testing**

1. Go to **Actions** tab in your GitHub repo
2. Find "VAT Quarter Auto-Creation" workflow
3. Click "Run workflow" → "Run workflow"
4. Check the logs for success/failure

#### **Test API with curl**

```bash
curl -X GET "https://your-app.vercel.app/api/vat-quarters/auto-create" \
  -H "Authorization: Bearer your-secret-here"
```

## 📅 Scheduling Details

### **When Does It Run?**

- **Schedule**: 1st of every month at 12:00 AM UTC
- **Cron Expression**: `0 0 1 * *`
- **Manual Trigger**: Available for testing

### **What Gets Created?**

Only creates quarters for clients whose quarters ended the **previous day**:

| Quarter End | Creation Date | Example |
|-------------|---------------|---------|
| June 30 | July 1 | Apr-Jun quarter created |
| September 30 | October 1 | Jul-Sep quarter created |
| December 31 | January 1 | Oct-Dec quarter created |

### **Assignment Logic**

1. **Previous User**: Assigns to the last user who worked on any VAT quarter for this client
2. **No Previous User**: Quarter remains unassigned
3. **Email Notification**: Sent only if a user is assigned

## 🔧 API Endpoint Details

### **Route**: `/api/vat-quarters/auto-create`

#### **Security**
- Requires `Authorization: Bearer <secret>` header
- Returns 401 if unauthorized
- Returns 500 if secret not configured

#### **Response Format**
```json
{
  "success": true,
  "message": "Successfully processed 25 clients. Created 5 quarters, sent 3 emails.",
  "details": {
    "processed": 25,
    "created": 5,
    "emailsSent": 3,
    "skipped": 20,
    "errors": []
  }
}
```

#### **What It Does**
1. Checks if today is the 1st of the month
2. Finds all VAT-enabled clients
3. Determines which clients had quarters ending yesterday
4. Creates new quarters (if not already existing)
5. Assigns to previous user (if any)
6. Sends email notifications
7. Returns comprehensive results

## 📧 Email Notifications

### **When Are Emails Sent?**

- Only when a quarter is created **and** assigned to a user
- Uses previous quarter's assigned user
- Professional HTML email template

### **Email Contents**

- **Subject**: "New VAT Quarter Assigned - Company Name (Client Code)"
- **Client Details**: Company name, client code, quarter period, due date
- **Assignment Details**: Assigned user, creation date, status
- **Next Steps**: Clear action items
- **Direct Link**: Link to VAT workflow dashboard

### **Email Template**

Professional HTML email with:
- Company branding
- Clear client information
- Assignment details
- Action steps
- Direct workflow link

## 🔍 Monitoring & Logging

### **GitHub Actions Logs**

- Real-time execution logs
- HTTP status codes
- Response details
- Error messages
- Success summaries

### **Application Logs**

```bash
# Example log output
📅 Processing VAT quarters for date: 2024-07-01T00:00:00.000Z
📊 Found 25 VAT-enabled clients
✅ Created quarter for ABC Ltd (NZ-123)
📧 Sent assignment email to John Smith
⏭️ Skipped XYZ Corp: No quarter ended yesterday
```

### **Error Handling**

- Individual client errors don't stop the process
- Comprehensive error logging
- Email notifications on failures
- Manual re-run capability

## 🛠️ Advanced Configuration

### **Timezone Handling**

- Uses `Europe/London` timezone for UK compliance
- Handles BST/GMT transitions automatically
- Ensures consistent UK accounting dates

### **Customization Options**

#### **Change Schedule**
Edit `.github/workflows/vat-automation.yml`:
```yaml
schedule:
  - cron: '0 0 1 * *'  # Monthly
  # - cron: '0 0 * * MON'  # Weekly on Monday
  # - cron: '0 9 * * *'    # Daily at 9 AM
```

#### **Add Slack Notifications**
Add to GitHub workflow:
```yaml
- name: Notify Slack
  if: always()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"VAT automation completed: ${{ job.status }}"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### **Add Teams Notifications**
```yaml
- name: Notify Teams
  if: always()
  run: |
    curl -X POST -H 'Content-Type: application/json' \
      --data '{"text":"VAT automation completed with status: ${{ job.status }}"}' \
      ${{ secrets.TEAMS_WEBHOOK_URL }}
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. GitHub Actions Not Running**
- Check cron syntax
- Verify workflow file location: `.github/workflows/vat-automation.yml`
- Ensure repository has Actions enabled

#### **2. API Call Fails**
- Verify `VERCEL_APP_URL` secret is correct
- Check `VAT_AUTO_CREATE_SECRET` matches in both places
- Test API manually with curl

#### **3. No Quarters Created**
- Check if today is the 1st of the month
- Verify clients have `vatQuarterGroup` set
- Check if quarters already exist

#### **4. No Emails Sent**
- Verify email service is configured
- Check if users have previous assignments
- Review email logs in application

### **Manual Recovery**

If automation fails, you can:

1. **Manual API Call**:
```bash
curl -X GET "https://your-app.vercel.app/api/vat-quarters/auto-create" \
  -H "Authorization: Bearer your-secret"
```

2. **Manual Workflow Trigger**:
   - Go to GitHub Actions
   - Click "Run workflow"
   - Execute manually

3. **Database Check**:
   - Verify quarters were created
   - Check assignment status
   - Review workflow history

## 📈 Usage Analytics

### **Success Metrics**
- Number of clients processed
- Quarters created successfully
- Emails sent
- Zero errors

### **Performance Monitoring**
- Execution time
- API response times
- Database query performance
- Email delivery rates

### **Reporting**
- Monthly automation reports
- Assignment distribution
- Error analysis
- Performance trends

## 🎯 Best Practices

1. **Test First**: Always test manually before relying on automation
2. **Monitor Logs**: Check GitHub Actions logs monthly
3. **Verify Results**: Spot-check created quarters in dashboard
4. **Backup Strategy**: Database backups before major changes
5. **Documentation**: Keep this doc updated with changes
6. **User Training**: Ensure staff understand the automation
7. **Contingency Plan**: Have manual process ready as backup

## 📋 Maintenance Schedule

### **Monthly Tasks**
- Review automation logs
- Verify correct quarters created
- Check email deliverability
- Monitor performance metrics

### **Quarterly Tasks**
- Review and update documentation
- Test manual triggers
- Verify GitHub Actions quota usage
- Update secrets if needed

### **Annual Tasks**
- Review and optimize automation logic
- Update notification templates
- Audit security settings
- Performance optimization

## 🔒 Security Considerations

1. **Secret Management**: Never commit secrets to version control
2. **API Authentication**: Strong bearer token authentication
3. **Rate Limiting**: Built-in protection against abuse
4. **Error Handling**: No sensitive data in error messages
5. **Access Control**: GitHub Actions logs are private to repository
6. **Audit Trail**: Complete logging of all actions

## 🌟 Benefits

✅ **Reliability**: 99.9% uptime with GitHub Actions
✅ **Cost-Effective**: Completely free with GitHub
✅ **Scalable**: Handles unlimited clients
✅ **Transparent**: Full logging and monitoring
✅ **Maintainable**: Simple, well-documented setup
✅ **Secure**: Industry-standard security practices
✅ **Flexible**: Easy to modify and extend

This automation system ensures your VAT quarters are created consistently, accurately, and on time, every month, without any manual intervention required. 