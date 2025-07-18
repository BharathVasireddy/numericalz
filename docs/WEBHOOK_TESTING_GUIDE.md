# Brevo Webhook Testing & Monitoring Guide

## 🎯 **Current Setup Status**

✅ **Webhook URL Configured**: `https://numericalz.cloud9digital.in/api/webhooks/brevo`  
✅ **All Events Subscribed**: Delivery, bounce, spam, open, click events  
✅ **Handler Ready**: Enhanced error handling and logging  
✅ **Database Fields**: Ready to capture detailed webhook data  

## 📊 **What Detailed Information You'll See**

### **In Email Logs** (`/dashboard/communication/history`)

Your email logs will now show:

| Field | Description | Example |
|-------|-------------|---------|
| **Status** | Real-time delivery status | `DELIVERED` (green), `BOUNCED` (red) |
| **Delivery Time** | Exact delivery timing | `"3.2s"` from send to delivery |
| **Webhook Badge** | Shows webhook received | `🔗 Webhook ✓` |
| **Failure Details** | Exact bounce/spam reasons | `"Invalid email address"` |
| **Event Type** | Brevo event details | `"delivered"`, `"hard_bounce"` |
| **Message ID** | Brevo tracking ID | `"<20241225@numericalz.com>"` |

### **Enhanced Timeline View**

```
📧 Created: 25/12/2024, 14:30:15
📤 Sent: 25/12/2024, 14:30:18
✅ Delivered: 25/12/2024, 14:30:21 (3.2s)
🔗 Webhook: 25/12/2024, 14:30:22
```

### **Webhook Data Details**

When you click on webhook details:
- **Message ID**: Brevo's internal tracking ID
- **Event Type**: `delivered`, `bounced`, `opened`, `clicked`
- **Timestamp**: Exact webhook receipt time
- **Service**: `brevo` (vs fallback services)
- **Bounce Reason**: Detailed failure explanation
- **Spam Score**: If flagged as spam (1-10 scale)

## 🧪 **How to Test the Webhook System**

### **Method 1: Live Email Test** (Recommended)

1. **Send a Test Email**:
   ```bash
   # Go to Communication Templates
   https://numericalz.cloud9digital.in/dashboard/communication/templates
   
   # Send test email to your own email address
   # Subject: "Webhook Test - [Current Time]"
   ```

2. **Monitor in Real-Time**:
   ```bash
   # Check webhook debug endpoint
   GET https://numericalz.cloud9digital.in/api/webhooks/brevo/debug
   
   # Response shows:
   {
     "webhookEffectiveness": "95%",
     "totalEmails": 10,
     "emailsWithWebhookData": 9
   }
   ```

3. **View Detailed Results**:
   ```bash
   # Get detailed webhook analysis
   GET https://numericalz.cloud9digital.in/api/webhooks/brevo/debug?details=true
   ```

### **Method 2: Webhook Simulation Test**

```bash
# Simulate webhook event (for testing handler)
POST https://numericalz.cloud9digital.in/api/webhooks/brevo/debug
Content-Type: application/json

{
  "action": "simulate_webhook"
}

# Response:
{
  "success": true,
  "message": "Test webhook sent",
  "webhookResponse": { ... }
}
```

### **Method 3: Browser Console Testing**

```javascript
// Test webhook debug in browser console
async function testWebhooks() {
  const response = await fetch('/api/webhooks/brevo/debug?details=true')
  const data = await response.json()
  
  console.log('📊 Webhook Stats:', data.stats)
  console.log('📧 Recent Emails:', data.recentEmails)
  console.log('⏳ Pending Webhooks:', data.pendingWebhooks)
}

testWebhooks()
```

## 🔍 **Monitoring Dashboard**

### **Real-Time Webhook Health Check**

```bash
# Quick health check
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://numericalz.cloud9digital.in/api/webhooks/brevo/debug"

# Expected Response:
{
  "webhookUrl": "https://numericalz.cloud9digital.in/api/webhooks/brevo",
  "webhookSetupComplete": true,
  "stats": {
    "totalEmails": 25,
    "emailsWithWebhookData": 24,
    "webhookEffectiveness": "96%",
    "statusBreakdown": {
      "DELIVERED": 20,
      "BOUNCED": 2,
      "SENT": 3
    },
    "pendingWebhooks": 1
  }
}
```

### **Email-Specific Analysis**

```bash
# Check specific email delivery
POST https://numericalz.cloud9digital.in/api/webhooks/brevo/debug
Content-Type: application/json

{
  "action": "check_delivery",
  "emailLogId": "cm5abc123def"
}

# Response shows exact webhook status for that email
```

## 🔧 **What to Look For During Testing**

### **✅ Good Signs (Webhooks Working)**

1. **Status Updates**: Emails change from `SENT` → `DELIVERED`
2. **Webhook Badge**: Purple `🔗 Webhook ✓` badge appears
3. **Delivery Times**: Shows precise timing (e.g., `"2.1s"`)
4. **High Effectiveness**: >90% webhook effectiveness rate
5. **Real-Time Updates**: Status changes within 5-30 seconds

### **⚠️ Warning Signs (Issues)**

1. **Stuck on SENT**: Emails remain `SENT` for >10 minutes
2. **Low Effectiveness**: <80% webhook effectiveness
3. **Missing Webhook Badge**: No purple webhook indicators
4. **High Pending Count**: Many emails waiting for webhooks

### **❌ Problems (Webhooks Failed)**

1. **All SENT Status**: No emails show `DELIVERED`
2. **Zero Webhook Data**: No webhook badges anywhere
3. **Error Messages**: Console shows webhook errors
4. **Timeout Issues**: Handler takes >5 seconds to respond

## 📈 **Performance Expectations**

### **Normal Performance**
- **Webhook Receipt Time**: 2-30 seconds after sending
- **Database Update Time**: <1 second after webhook
- **UI Refresh Time**: Real-time (if page refreshed)
- **Success Rate**: >95% for valid emails

### **Email Status Timeline**
```
⏱️ 0s    - Email created (PENDING)
⏱️ 1-3s  - Email sent (SENT)
⏱️ 2-30s - Email delivered (DELIVERED) ← Webhook updates this
⏱️ 30s+  - Opens/clicks tracked (if enabled)
```

## 🛠️ **Troubleshooting Guide**

### **Issue: No Webhooks Received**

1. **Check Brevo Dashboard**:
   - Verify webhook URL is correct
   - Check webhook event subscriptions
   - Look for failed webhook attempts

2. **Test Webhook Endpoint**:
   ```bash
   # Test if endpoint is accessible
   curl -X POST https://numericalz.cloud9digital.in/api/webhooks/brevo \
     -H "Content-Type: application/json" \
     -d '{"test": "webhook"}'
   ```

3. **Check Server Logs**:
   ```bash
   # Look for webhook entries
   📨 Brevo webhook received: ...
   ✅ Webhook processed successfully
   ```

### **Issue: Partial Webhook Updates**

1. **Check Debug Endpoint**:
   ```bash
   GET /api/webhooks/brevo/debug?details=true
   # Look for pendingWebhooks count
   ```

2. **Verify Email Status**:
   - Some emails may be legitimately pending
   - Check if emails are actually delivered to inbox

### **Issue: Webhook Errors**

1. **Check Error Logs**:
   ```bash
   # Look for specific error messages
   ❌ Webhook processing failed: ...
   ```

2. **Test Database Connection**:
   ```bash
   GET /api/webhooks/brevo/debug
   # Should return stats without errors
   ```

## 📝 **Testing Checklist**

### **Before Sending Client Emails**

- [ ] Send test email to yourself
- [ ] Verify webhook badge appears
- [ ] Check delivery status updates
- [ ] Confirm timeline shows delivery time
- [ ] Test bounce scenario (invalid email)
- [ ] Check webhook effectiveness >90%

### **Regular Monitoring**

- [ ] Check webhook debug endpoint daily
- [ ] Monitor pending webhook count
- [ ] Review failed emails for patterns
- [ ] Test with different email providers
- [ ] Verify bounce handling works correctly

## 🚀 **Next Steps**

1. **Send Test Email** → Check `/dashboard/communication/history`
2. **Monitor Webhook Debug** → Use `/api/webhooks/brevo/debug`
3. **Send Client Email** → Verify real-world performance
4. **Set Up Monitoring** → Regular webhook health checks

Your webhook system is now fully operational and will provide detailed delivery reporting for all emails sent through your system! 🎉 