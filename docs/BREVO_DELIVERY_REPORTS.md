# Brevo Email Delivery Reports Setup Guide

## Overview

This guide explains how to set up comprehensive email delivery reporting for your Numericalz system using Brevo webhooks. With this setup, you'll get real-time delivery status updates including bounces, opens, clicks, and more.

## Current Status ✅

Your system already has:
- **Email Logging**: All emails are logged to the `EmailLog` table
- **Basic Status Tracking**: Immediate success/failure from Brevo API
- **Email History Dashboard**: View email history at `/dashboard/communication/history`
- **Webhook Handler**: Ready to receive Brevo delivery events at `/api/webhooks/brevo`

## Available Delivery Events

With Brevo webhooks, you can track:

| Event | Description | Status Update |
|-------|-------------|---------------|
| **✅ Delivered** | Email successfully delivered to inbox | `DELIVERED` |
| **📧 Opened** | Recipient opened the email | `DELIVERED` |
| **🔗 Clicked** | Recipient clicked a link | `DELIVERED` |
| **🔄 Soft Bounce** | Temporary failure (mailbox full, server busy) | `FAILED` |
| **❌ Hard Bounce** | Permanent failure (invalid email, domain doesn't exist) | `BOUNCED` |
| **⚠️ Spam Report** | Email marked as spam | `FAILED` |
| **🚫 Unsubscribed** | Recipient unsubscribed | `SENT` (tracked separately) |
| **❌ Blocked** | Email blocked by recipient's server | `FAILED` |

## 🛡️ Reliability & Failure Handling

### **Multiple Layers of Protection**

#### 1. **Enhanced Webhook Handler**
- ✅ Comprehensive error handling and logging
- ✅ Failed event tracking for debugging
- ✅ Graceful degradation when errors occur
- ✅ Event deduplication to prevent duplicates
- ✅ Multiple email matching strategies
- ✅ Detailed processing statistics

#### 2. **Fallback Verification System**
When webhooks fail or are delayed, the system has automatic fallback mechanisms:

```bash
# Check all emails missing delivery confirmations
POST /api/email/verify-delivery
{
  "checkAll": true
}

# Check specific email
POST /api/email/verify-delivery  
{
  "emailLogId": "specific-email-id"
}
```

#### 3. **Smart Heuristics for Missing Webhooks**
- **24+ hours old**: Assume delivered (no bounce = likely delivered)
- **Known client emails**: Higher confidence in delivery after 2+ hours
- **Business domains**: Assume delivered after 6+ hours
- **Invalid patterns**: Automatically mark as failed (test@, noreply@, etc.)
- **Test domains**: Flag emails to example.com, test.com as failed

### **What Happens When Webhooks Fail?**

#### **Scenario 1: Network Issues**
- **Problem**: Brevo can't reach your webhook endpoint
- **Solution**: Webhook events are logged with failure details
- **Fallback**: Manual verification endpoint checks stale emails
- **Recovery**: Automatic status updates based on time heuristics

#### **Scenario 2: Server Downtime**  
- **Problem**: Your server is down when webhooks arrive
- **Solution**: Brevo retries webhooks automatically (typically 3-5 times)
- **Fallback**: Stale email detection runs automatically
- **Recovery**: Status updated when emails are old enough to assume delivery

#### **Scenario 3: Database Issues**
- **Problem**: Webhook received but database update fails
- **Solution**: Error logged to failed events for manual review
- **Fallback**: Webhook returns success to Brevo to prevent retries
- **Recovery**: Failed events can be replayed manually

#### **Scenario 4: Processing Errors**
- **Problem**: Webhook data can't be processed (missing fields, etc.)
- **Solution**: Detailed error logging with original webhook data
- **Fallback**: Email still tracked in logs for manual investigation
- **Recovery**: Can be replayed once issue is fixed

### **Testing Webhook Reliability**

```bash
# Test webhook endpoint directly
curl -X POST https://your-domain.com/api/webhooks/brevo/test \
  -H "Content-Type: application/json" \
  -d '{"event": "delivered", "email": "test@example.com"}'

# Check webhook statistics
GET /api/webhooks/brevo
# Returns: success_rate, total_events, failed_events

# View failed webhook events  
GET /api/webhooks/brevo?failed=true
# Returns: detailed failure information for debugging

# Check email delivery health
GET /api/email/verify-delivery
# Returns: delivery rates, stale emails, webhook health status
```

### **Monitoring & Alerting**

#### **Webhook Health Indicators**
- **Good**: <10 stale emails waiting for delivery confirmation
- **Degraded**: 10-50 stale emails (some webhook delays)
- **Poor**: >50 stale emails (webhook failures)

#### **Automatic Recovery Actions**
1. **Every hour**: Check for emails older than 1 hour without delivery status
2. **Daily**: Run heuristic analysis on emails older than 24 hours  
3. **Weekly**: Clean up test emails and invalid addresses
4. **On-demand**: Manual verification for critical emails

## Setup Instructions

### Step 1: Configure Webhook in Brevo Dashboard

1. **Log in to your Brevo account**
   - Go to [https://app.brevo.com/](https://app.brevo.com/)

2. **Navigate to Webhook Settings**
   
   **Option A: From Transactional Section (Recommended)**
   - Click **Transactional** → **Settings** → **Webhook**
   - Click **Add a New Webhook**
   
   **Option B: From Contacts/Campaigns Section**
   - Click **Contacts** → **Settings** → **Webhook**
   - Click **Add a New Webhook**

3. **Configure the Webhook**
   
   **Webhook URL:**
   ```
   https://your-domain.com/api/webhooks/brevo
   ```
   
   **Events to Subscribe To:**
   - ✅ **Hard Bounce** (Permanent delivery failures)
   - ✅ **Soft Bounce** (Temporary delivery failures)  
   - ✅ **Delivered** (Successful deliveries)
   - ✅ **Spam** (Marked as spam)
   - ✅ **Invalid Email** (Invalid email addresses)
   - ✅ **Deferred** (Delayed delivery)
   - ✅ **Blocked** (Blocked by recipient server)
   - ✅ **Unsubscribed** (Unsubscribe events)
   - ✅ **Opened** (Email opens - optional for engagement tracking)
   - ✅ **Clicked** (Link clicks - optional for engagement tracking)

4. **Save the Webhook**
   - Add a description: "Numericalz Delivery Reports"
   - Click **Save** or **Add**

### Step 2: Test the Webhook

1. **Send a Test Email**
   ```bash
   # Use your email template system to send a test email
   # Or test via the communication dashboard
   ```

2. **Check Webhook Events**
   ```bash
   # Visit this URL to see recent webhook events
   GET https://your-domain.com/api/webhooks/brevo?limit=10
   ```

3. **Verify Email Log Updates**
   - Check the email history in your dashboard
   - Status should update from `SENT` to `DELIVERED` when webhook is received

### Step 3: Monitor Delivery Reports

#### Dashboard View
- Go to `/dashboard/communication/history`
- View real-time delivery status for all emails
- Filter by status: `DELIVERED`, `BOUNCED`, `FAILED`, etc.

#### Database Query
```sql
-- Check delivery rates
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_logs 
WHERE sentAt > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Check recent bounced emails
SELECT 
  recipientEmail,
  failureReason,
  failedAt,
  subject
FROM email_logs 
WHERE status = 'BOUNCED' 
ORDER BY failedAt DESC 
LIMIT 10;
```

## Webhook Event Examples

### Successful Delivery
```json
{
  "event": "delivered",
  "email": "client@example.com",
  "date": "2025-01-20T10:30:00Z",
  "message-id": "<14c5d75ce93.dfd.64b469@brevo.com>",
  "tag": "client-communication"
}
```

### Hard Bounce
```json
{
  "event": "hard_bounce",
  "email": "invalid@nonexistent.com", 
  "date": "2025-01-20T10:31:00Z",
  "reason": "550 No such user here",
  "message-id": "<14c5d75ce93.dfd.64b469@brevo.com>"
}
```

### Email Opened
```json
{
  "event": "opened",
  "email": "client@example.com",
  "date": "2025-01-20T11:15:00Z",
  "message-id": "<14c5d75ce93.dfd.64b469@brevo.com>",
  "ip": "192.168.1.100",
  "user-agent": "Mozilla/5.0..."
}
```

## Benefits of Enhanced Delivery Reporting

### 1. **Improved Email Hygiene**
- Automatically identify and handle bounced emails
- Remove invalid email addresses from your system
- Reduce future delivery issues

### 2. **Better Client Communication**
- Know when important emails are delivered vs. bounced
- Follow up on undelivered communications
- Ensure critical deadlines and notices reach clients

### 3. **Compliance & Audit Trail**
- Complete delivery tracking for compliance requirements
- Audit trail for all client communications
- Evidence of communication attempts

### 4. **Engagement Insights**
- Track email open rates (if enabled)
- Monitor link click engagement
- Identify most effective communication patterns

### 5. **System Reliability**
- Real-time delivery monitoring
- Automatic status updates
- Reduced manual email tracking

## Troubleshooting

### Webhook Not Receiving Events
1. **Check URL Accessibility**
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/brevo \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

2. **Check Brevo Webhook Logs**
   - In Brevo dashboard, check webhook delivery logs
   - Look for HTTP errors or timeout issues

3. **Verify Event Configuration**
   - Ensure all desired events are checked in Brevo
   - Confirm webhook URL is correct

### Email Logs Not Updating
1. **Check Application Logs**
   ```bash
   # Look for webhook processing logs
   grep "Brevo webhook" /var/log/your-app.log
   ```

2. **Verify Database Connection**
   - Ensure webhook handler can connect to database
   - Check for database permission issues

3. **Check Message ID Matching**
   - Webhook tries to match emails by message ID
   - Falls back to email address + recent timestamp

### Testing Specific Events
```bash
# Test webhook endpoint directly
curl -X POST https://your-domain.com/api/webhooks/brevo \
  -H "Content-Type: application/json" \
  -d '{
    "event": "delivered",
    "email": "test@example.com", 
    "date": "2025-01-20T10:30:00Z",
    "message-id": "test-message-id"
  }'
```

## Best Practices

### 1. **Monitor Bounce Rates**
- Keep bounce rates under 5% for good deliverability
- Investigate high bounce rates immediately
- Clean email lists regularly

### 2. **Handle Bounced Emails**
- Soft bounces: Retry 2-3 times over several days
- Hard bounces: Remove from active email list immediately
- Invalid emails: Update client records

### 3. **Track Important Communications**
- Monitor delivery of critical deadline notices
- Follow up on bounced VAT filing reminders
- Ensure client onboarding emails are delivered

### 4. **Regular Reporting**
- Weekly delivery rate reports
- Monthly bounce analysis
- Quarterly email hygiene review

### 5. **Use Fallback Verification**
- Run manual verification weekly: `POST /api/email/verify-delivery {"checkAll": true}`
- Check webhook health regularly: `GET /api/webhooks/brevo`
- Monitor stale email counts: `GET /api/email/verify-delivery`

## API Endpoints

### View Recent Webhook Events
```bash
GET /api/webhooks/brevo?limit=20&event=delivered
```

### View Failed Webhook Events  
```bash
GET /api/webhooks/brevo?failed=true&limit=20
```

### Check Email Delivery Health
```bash
GET /api/email/verify-delivery
```

### Manual Email Verification
```bash
POST /api/email/verify-delivery
{
  "checkAll": true
}
```

### Test Webhook Functionality
```bash
GET /api/webhooks/brevo/test?type=delivered
POST /api/webhooks/brevo/test
```

### Email Logs API
```bash
GET /api/communication/history?status=BOUNCED&limit=50
```

## Database Schema Updates

The webhook handler updates these fields in `email_logs`:

| Field | Description |
|-------|-------------|
| `status` | Updated based on delivery event |
| `deliveredAt` | Set when email is delivered/opened/clicked |
| `failedAt` | Set when email bounces or fails |
| `failureReason` | Contains bounce/failure details |
| `updatedAt` | Timestamp of last webhook update |

## Conclusion

With Brevo webhooks configured, your Numericalz system will have:

- ✅ **Real-time delivery tracking**
- ✅ **Automatic bounce handling** 
- ✅ **Comprehensive audit trail**
- ✅ **Improved client communication reliability**
- ✅ **Better email deliverability over time**
- ✅ **Robust failure handling and recovery**
- ✅ **Multiple fallback mechanisms**
- ✅ **Detailed monitoring and alerting**

This enhanced delivery reporting ensures you never miss important client communications and maintain the highest standards of professional service delivery. 