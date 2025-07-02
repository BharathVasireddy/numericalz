# VAT Quarter Automation System

## 🎯 Overview

The VAT Quarter Automation System provides complete automation for VAT quarter transitions and partner notifications. The system automatically handles the transition from `WAITING_FOR_QUARTER_END` to `PAPERWORK_PENDING_CHASE` at midnight when the quarter end date passes, with immediate partner notifications. Quarters remain unassigned for manual partner assignment.

## ✅ Implementation Status: FULLY OPERATIONAL

**Status**: ✅ **PRODUCTION READY**  
**Created**: June 26, 2025  
**Implementation**: Complete with automated scheduling and partner notifications  

---

## 🔄 System Architecture

### Core Components

1. **Transition Engine** (`checkVATQuarterTransitions()`)
   - Monitors quarters in `WAITING_FOR_QUARTER_END` status
   - Automatically transitions past-due quarters to `PAPERWORK_PENDING_CHASE`
   - Uses London timezone for UK compliance
   - Creates complete audit trail

2. **Notification System** (`sendVATTransitionNotification()`)
   - Sends email notifications to all active partners
   - Professional email templates with full quarter details
   - Integrates with existing email logging system
   - Respects partner email notification preferences

3. **Auto-Assignment Engine** (`autoAssignTransitionedQuarters()`)
   - Assigns unassigned quarters to partners using round-robin
   - Sends individual assignment notifications
   - Creates workflow history entries
   - Maintains workload distribution

4. **Scheduled Automation** (Daily at 12:00 AM London time)
   - Runs transitions automatically (no auto-assignment)
   - Quarters remain unassigned for manual partner assignment
   - Comprehensive error handling and logging
   - Integration with existing cron job system

---

## 📋 Workflow Lifecycle

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Quarter Running │ -> │ Quarter Ends    │ -> │ System Detects  │
│(Current Quarter)│    │ (30 June 23:59) │    │(Daily Midnight) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Partners Get    │ <- │ Auto-Transition │ <- │ WAITING_FOR_    │
│ Notifications   │    │  (Automated)    │    │  QUARTER_END    │
│ (Email Alerts)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                v
                       ┌─────────────────┐
                       │ PAPERWORK_      │
                       │ PENDING_CHASE   │
                       │ (Unassigned)    │
                       └─────────────────┘
                                │
                                v
                       ┌─────────────────┐
                       │ Manual Partner  │
                       │ Assignment      │
                       │ (Dashboard)     │
                       └─────────────────┘
```

---

## 🕐 Automated Schedule

### Daily Operations (12:00 AM London Time)
```javascript
// Cron: '0 0 * * *'
await checkVATQuarterTransitions()
```

**Process Flow:**
1. **Scan** all quarters in `WAITING_FOR_QUARTER_END` status
2. **Check** quarter end dates against current London time  
3. **Transition** quarters where `quarterEndDate < londonNow`
4. **Notify** all active partners via email
5. **Leave** quarters unassigned for manual partner assignment
6. **Log** all activities and create audit trails

---

## 📊 Database Operations

### Transition Process
```sql
-- Find quarters ready for transition
SELECT * FROM vat_quarters 
WHERE currentStage = 'WAITING_FOR_QUARTER_END'
  AND isCompleted = false
  AND quarterEndDate < CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London';

-- Update to pending chase
UPDATE vat_quarters 
SET currentStage = 'PAPERWORK_PENDING_CHASE',
    updatedAt = CURRENT_TIMESTAMP
WHERE id = ?;

-- Create workflow history
INSERT INTO vat_workflow_history (
  vatQuarterId, fromStage, toStage, stageChangedAt,
  userName, userRole, notes
) VALUES (?, 'WAITING_FOR_QUARTER_END', 'PAPERWORK_PENDING_CHASE', ?, 
         'System Auto-Update', 'SYSTEM', 'Automatically transitioned...');
```

### Email Logging
```sql
-- Log partner notifications
INSERT INTO email_logs (
  recipientEmail, recipientName, subject, content,
  emailType, status, clientId, triggeredBy,
  workflowType, workflowId
) VALUES (?, ?, ?, ?, 'VAT_QUARTER_TRANSITION', 'PENDING', ?, ?, 'VAT', ?);
```

---

## 🔧 Technical Implementation

### Core Functions

#### `checkVATQuarterTransitions()`
```javascript
// Location: scripts/vat-quarter-automation.js
async function checkVATQuarterTransitions() {
  const londonNow = toLondonTime(new Date())
  
  // Find quarters past their end date
  const quartersToTransition = await prisma.vATQuarter.findMany({
    where: {
      currentStage: 'WAITING_FOR_QUARTER_END',
      isCompleted: false,
      quarterEndDate: { lt: londonNow }
    },
    include: { client: true }
  })
  
  // Process each quarter
  for (const quarter of quartersToTransition) {
    // Update status
    await prisma.vATQuarter.update({
      where: { id: quarter.id },
      data: { currentStage: 'PAPERWORK_PENDING_CHASE' }
    })
    
    // Create audit trail
    await prisma.vATWorkflowHistory.create({ ... })
    
    // Send notifications
    await sendVATTransitionNotification(quarter, londonNow)
  }
}
```

#### Notification System
```javascript
async function sendVATTransitionNotification(quarter, transitionTime) {
  // Get all active partners with email notifications enabled
  const partners = await prisma.user.findMany({
    where: {
      role: 'PARTNER',
      isActive: true,
      userSettings: { emailNotifications: true }
    }
  })
  
  // Send notifications to all partners
  for (const partner of partners) {
    await sendPartnerNotificationEmail(partner, quarter, ...)
  }
}
```

#### Cron Job Configuration
```javascript
// Location: scripts/setup-cron-jobs.js
const vatQuarterTransitionJob = cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Running scheduled VAT quarter transition check...')
  
  try {
    const transitionResults = await checkVATQuarterTransitions()
    
    console.log('📊 Results:', transitionResults)
    console.log('   Note: Quarters remain unassigned for manual partner assignment')
  } catch (error) {
    console.error('❌ VAT automation failed:', error)
  }
}, {
  scheduled: true,
  timezone: 'Europe/London'
})
```

---

## 📧 Email Notification System

### Transition Notification Template
```
Subject: VAT Quarter Ready for Chase - [Company Name] ([Client Code])

Dear [Partner Name],

A VAT quarter has automatically transitioned and is now ready for partner review and assignment.

Client Details:
• Company: [Company Name]
• Client Code: [Client Code]  
• Quarter Period: [Start Date] to [End Date]
• Quarter End Date: [End Date]
• Filing Due Date: [Due Date]

Status Change:
• From: Waiting for Quarter End
• To: Paperwork Pending Chase
• Transition Time: [London Time]

Action Required:
This VAT quarter is now available for assignment and chase initiation. 
Please review and assign to an appropriate team member for processing.

Access the VAT deadlines dashboard at:
https://app.numericalz.com/dashboard/clients/vat-dt

Best regards,
Numericalz Automation System
```

### Assignment Notification Template
```
Subject: VAT Quarter Assigned - [Company Name] ([Client Code])

Dear [Partner Name],

A VAT quarter has been automatically assigned to you for processing.

Client Details:
• Company: [Company Name]
• Client Code: [Client Code]
• Quarter Period: [Period]
• Quarter End Date: [Date]
• Filing Due Date: [Date]

Assignment Details:
• Assigned To: [Partner Name]
• Assignment Time: [London Time]
• Status: Paperwork Pending Chase

Next Steps:
1. Review the VAT quarter requirements
2. Initiate client chase for paperwork  
3. Update the workflow status as you progress

Access the VAT workflow at:
https://app.numericalz.com/dashboard/clients/vat-dt

Best regards,
Numericalz Automation System
```

---

## 🚀 Production Deployment

### Prerequisites
1. **Email system** configured and operational
2. **Partner users** with active status and email addresses
3. **Cron job system** running (`npm run cron:start`)
4. **London timezone** utilities operational

### Starting the System
```bash
# Start all automated workflows (including VAT automation)
npm run cron:start

# Test VAT automation manually
npm run vat:automation

# Test the system
npm run vat:test
```

### Available Commands
```bash
# Manual execution
npm run vat:automation                # Run transitions only (quarters remain unassigned)
npm run vat:automation-with-assign    # Run transitions + auto-assignment (optional)
npm run vat:test                     # Test the automation system
npm run vat:test-with-assign         # Test with auto-assignment
npm run vat:auto-assign             # Legacy assignment only

# Cron management
npm run cron:start                   # Start all scheduled jobs
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring
- Check cron job logs at midnight (12:00 AM) London time
- Verify transitions are processed correctly
- Monitor email log queue for partner notifications
- Check for any error messages or failed transitions
- Confirm quarters are left unassigned for manual partner assignment

### Email Monitoring
```sql
-- Check recent VAT notifications
SELECT * FROM email_logs 
WHERE emailType IN ('VAT_QUARTER_TRANSITION', 'VAT_QUARTER_ASSIGNMENT')
  AND createdAt >= NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;

-- Check notification status
SELECT emailType, status, COUNT(*) 
FROM email_logs 
WHERE emailType LIKE 'VAT_%' 
  AND createdAt >= NOW() - INTERVAL '7 days'
GROUP BY emailType, status;
```

### Key Metrics
- **Transition Success Rate**: Should be 100% for eligible quarters
- **Notification Delivery**: Monitor email log status
- **Unassigned Quarters**: Quarters awaiting manual partner assignment
- **Processing Time**: Typically <5 seconds for transitions and notifications

---

## 🔍 Troubleshooting

### Common Issues

#### 1. No Transitions Occurring
**Symptoms**: Quarters remain in `WAITING_FOR_QUARTER_END`  
**Diagnosis**: 
```bash
# Check current London time
node -e "console.log(new Date().toLocaleString('en-GB', {timeZone: 'Europe/London'}))"

# Check quarters ready for transition
npm run vat:test
```
**Solution**: Verify quarter end dates and London timezone calculations

#### 2. Partners Not Receiving Notifications
**Symptoms**: Email logs show as 'PENDING' but partners report no emails  
**Diagnosis**:
```sql
-- Check email notification settings
SELECT u.name, u.email, us.emailNotifications 
FROM users u 
LEFT JOIN user_settings us ON u.id = us.userId 
WHERE u.role = 'PARTNER' AND u.isActive = true;
```
**Solution**: 
- Verify partner email settings in UserSettings
- Check email service configuration
- Review email log error messages

#### 3. Cron Job Not Running
**Symptoms**: No automation activity at scheduled times
**Solution**:
```bash
# Check if cron jobs are running
ps aux | grep node
ps aux | grep cron

# Restart automation
npm run cron:start
```

#### 4. Assignment Issues
**Symptoms**: Quarters transition but aren't assigned to partners
**Diagnosis**: Check partner availability and round-robin logic
**Solution**: Verify active partners exist and assignment algorithm

---

## 📝 Activity Logging

### System Attribution
All automated actions are logged with:
- **User ID**: `null` (system action)
- **User Name**: "System Auto-Update"  
- **User Email**: "system@numericalz.com"
- **User Role**: "SYSTEM"
- **Timestamp**: London timezone
- **Notes**: Detailed reason for action

### Activity Log Entries
```json
{
  "action": "VAT_QUARTER_AUTO_TRANSITIONED",
  "details": {
    "vatQuarterId": "quarter_id",
    "clientId": "client_id", 
    "clientCode": "NZ-123",
    "companyName": "Example Ltd",
    "quarterPeriod": "01_04_2025_to_30_06_2025",
    "quarterGroup": "2_5_8_11",
    "quarterEndDate": "2025-06-30T23:59:59.000Z",
    "transitionedAt": "2025-07-01T03:00:15.123Z"
  }
}
```

---

## 🎯 Business Benefits

### For Partners
- **Immediate Awareness**: Email alerts as soon as quarters are ready
- **No Manual Monitoring**: System handles all date tracking automatically  
- **Consistent Process**: Standardized workflow for all VAT quarters
- **Assignment Control**: Manual assignment allows partners to manage workload distribution

### For Operations
- **Immediate Transitions**: Quarters transition at midnight after quarter end
- **Complete Audit Trail**: Full logging of all automated actions
- **UK Compliance**: London timezone ensures correct HMRC deadlines
- **Reduced Manual Work**: Eliminates need for daily quarter checking
- **Flexible Assignment**: Partners can assign quarters based on workload and expertise

### For Clients
- **Faster Processing**: Work begins immediately after quarter end
- **Consistent Service**: Automated assignment ensures no quarters are missed
- **Reliable Deadlines**: System prevents deadline overruns

---

## 🔗 Integration Points

### Existing Systems
- **Email Logging**: Uses existing `email_logs` table
- **Activity Logging**: Integrates with current activity system
- **User Management**: Respects user settings and preferences  
- **Cron Jobs**: Part of existing automation framework
- **London Timezone**: Uses centralized timezone utilities

### API Dependencies
- **Prisma Client**: Database operations
- **Email System**: Notification delivery
- **User Settings**: Email preference management
- **London Time Utilities**: Timezone calculations

---

## 📈 Future Enhancements

### Planned Improvements
1. **Smart Assignment**: Consider partner workload and expertise
2. **Client Preferences**: Respect client-specific partner assignments  
3. **Escalation Rules**: Auto-escalate if no action taken within timeframe
4. **Mobile Notifications**: Push notifications for urgent quarters
5. **Analytics Dashboard**: Track automation performance metrics

### Configuration Options
1. **Notification Timing**: Configurable delay after quarter end
2. **Assignment Rules**: Customizable partner selection algorithms
3. **Email Templates**: Editable notification content
4. **Escalation Policies**: Configurable timeout and escalation rules

---

## 📚 Related Documentation
- [VAT System Documentation](./VAT_SYSTEM_DOCUMENTATION.md)
- [London Timezone System](./LONDON_TIMEZONE_SYSTEM.md)  
- [Email System Documentation](./EMAIL_SYSTEM.md)
- [Automatic Workflow Transitions](./AUTOMATIC_WORKFLOW_TRANSITION_SYSTEM.md)

---

## ✅ Final Checklist

Before using the VAT Quarter Automation System:

- [ ] Cron jobs are running (`npm run cron:start`)
- [ ] Partners have email notification settings enabled
- [ ] Email system is configured and operational
- [ ] London timezone utilities are working correctly
- [ ] Test run completed successfully (`npm run vat:test`)
- [ ] Email logs are being created properly
- [ ] Partners understand the new automated notifications
- [ ] Monitoring procedures are in place

**The VAT Quarter Automation System ensures immediate processing of VAT quarters at midnight with comprehensive partner notifications, maintaining UK accounting compliance while allowing flexible manual assignment based on partner workload and expertise.** 