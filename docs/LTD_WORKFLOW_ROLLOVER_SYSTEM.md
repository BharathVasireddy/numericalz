# Ltd Companies Workflow Rollover System

## 🎯 Overview

The Ltd Companies Workflow Rollover System automatically manages the transition of completed Ltd company accounts workflows to the next year's workflow. This ensures continuous workflow management without manual intervention.

## 🔄 Workflow Lifecycle

### Current Process (AUREY LTD Example)
```
Year End: 30 Sept 2025
Accounts Due: 30 Jun 2026
Status: Filed to CH&HMRC (completed)
Filed Date: 25 May 2025
```

### Rollover Process
```
1. FILING COMPLETED (25 May 2025)
   ├── Workflow marked as completed
   ├── Companies House data refreshed
   └── 1-month wait period begins

2. ROLLOVER TRIGGER (25 June 2025)
   ├── System creates new workflow
   ├── Period: 1 Oct 2025 to 30 Sept 2026
   ├── Stage: WAITING_FOR_YEAR_END
   ├── Assignment: Unassigned
   └── Uses updated Companies House dates

3. YEAR END PASSES (1 Oct 2026)
   ├── Auto-transition: WAITING_FOR_YEAR_END → PAPERWORK_PENDING_CHASE
   ├── Workflow history created
   ├── Appears in pending-to-chase dashboard
   └── Ready for staff assignment
```

## 🏗️ Technical Implementation

### Database Schema Changes

#### 1. New Workflow Stage
```sql
-- Added WAITING_FOR_YEAR_END to LtdAccountsWorkflowStage enum
ALTER TYPE "LtdAccountsWorkflowStage" ADD VALUE 'WAITING_FOR_YEAR_END' BEFORE 'PAPERWORK_PENDING_CHASE';
```

#### 2. Enum Values (Updated)
```
1. WAITING_FOR_YEAR_END          ← NEW
2. PAPERWORK_PENDING_CHASE
3. PAPERWORK_CHASED
4. PAPERWORK_RECEIVED
5. WORK_IN_PROGRESS
6. DISCUSS_WITH_MANAGER
7. REVIEW_BY_PARTNER
8. REVIEW_DONE_HELLO_SIGN
9. SENT_TO_CLIENT_HELLO_SIGN
10. APPROVED_BY_CLIENT
11. SUBMISSION_APPROVED_PARTNER
12. FILED_CH_HMRC
13. CLIENT_SELF_FILING
14. REVIEWED_BY_MANAGER
15. REVIEWED_BY_PARTNER
```

### Scripts and Automation

#### 1. Rollover Script
```bash
npm run ltd:rollover
```
**File**: `scripts/ltd-workflow-rollover.js`

**Functions**:
- `rolloverLtdWorkflows()` - Main rollover logic
- `checkYearEndStatus()` - Transitions waiting workflows

**Rollover Criteria**:
- Workflow is completed (`isCompleted: true`)
- Current stage is `FILED_CH_HMRC`
- Filed date is ≥ 1 month ago
- No existing workflow for next period

#### 2. Supporting Scripts
```bash
# Check enum values in database
node scripts/check-enum-values.js

# Add enum value to database
node scripts/apply-waiting-for-year-end-enum.js

# Demo rollover functionality
node scripts/test-ltd-rollover-demo.js
```

### UI Components Updated

#### 1. Ltd Companies Deadlines Table
**File**: `components/clients/ltd-companies-deadlines-table.tsx`

**Changes**:
- Added `WAITING_FOR_YEAR_END` to `WORKFLOW_STAGES`
- Icon: Calendar
- Color: `bg-gray-100 text-gray-800`

#### 2. Advanced Filter Modal
**File**: `components/clients/advanced-filter-modal.tsx`

**Changes**:
- Added `WAITING_FOR_YEAR_END` to filter options
- Label: "Waiting for year end"

#### 3. Activity Log Viewer
**File**: `components/activity/activity-log-viewer.tsx`

**Changes**:
- Added stage mapping: `'WAITING_FOR_YEAR_END': 'Waiting for Year End'`

## 🤖 Automation Setup

### Cron Job Configuration
```javascript
// Add to cron jobs (monthly execution)
const cron = require('node-cron')

// Run on 1st of every month at 2 AM
cron.schedule('0 2 1 * *', async () => {
  console.log('🔄 Running Ltd workflow rollover...')
  await require('./scripts/ltd-workflow-rollover.js').rolloverLtdWorkflows()
})

// Run daily to check year end transitions
cron.schedule('0 3 * * *', async () => {
  console.log('🔍 Checking year end transitions...')
  await require('./scripts/ltd-workflow-rollover.js').checkYearEndStatus()
})
```

## 📊 Business Logic

### Rollover Decision Matrix

| Condition | Action | Reason |
|-----------|--------|--------|
| Filed < 1 month ago | Wait | Allow Companies House data to update |
| Filed ≥ 1 month ago | Create rollover | Begin next year workflow |
| Year end passed | Auto-transition | Start active workflow |
| Companies House data available | Use official dates | Ensure accuracy |
| No Companies House data | Calculate dates | Fallback method |

### Date Calculation Priority

1. **Companies House Official Dates** (Priority 1)
   - `nextAccountsDue` from Companies House API
   - `nextYearEnd` from Companies House API
   - `nextCorporationTaxDue` calculated (year end + 12 months)

2. **Calculated Dates** (Fallback)
   - Based on current workflow pattern
   - Add 1 year to existing dates

### Assignment Logic

- **Initial Assignment**: `null` (Unassigned)
- **Rationale**: Allow managers to assign based on current workload
- **Future Enhancement**: Could use AI/ML for optimal assignment

## 🔧 Configuration

### Environment Variables
```env
# Rollover automation settings
LTD_ROLLOVER_ENABLED=true
LTD_ROLLOVER_WAIT_MONTHS=1
LTD_AUTO_TRANSITION_ENABLED=true
```

### Package.json Scripts
```json
{
  "scripts": {
    "ltd:rollover": "node scripts/ltd-workflow-rollover.js"
  }
}
```

## 🧪 Testing

### Manual Testing
```bash
# Test rollover functionality
node scripts/test-ltd-rollover-demo.js

# Check current system state
npm run ltd:rollover
```

### Test Scenarios

#### Scenario 1: Eligible Rollover
```
Given: Workflow filed > 1 month ago
When: Rollover script runs
Then: New workflow created with WAITING_FOR_YEAR_END
```

#### Scenario 2: Year End Transition
```
Given: Workflow in WAITING_FOR_YEAR_END
And: Year end date has passed
When: Transition script runs
Then: Stage changes to PAPERWORK_PENDING_CHASE
```

#### Scenario 3: Companies House Integration
```
Given: Rollover creates new workflow
When: Companies House data is available
Then: Use official dates for accounts due
```

## 🚨 Error Handling

### Common Issues

#### 1. Enum Value Not Found
```
Error: Invalid value for argument currentStage
Solution: Regenerate Prisma client after schema changes
```

#### 2. Missing Companies House Data
```
Fallback: Use calculated dates based on current workflow
Log: Warning about missing official data
```

#### 3. Duplicate Workflows
```
Check: Prevent duplicate workflows for same period
Logic: Skip if newer workflow already exists
```

### Monitoring

#### Database Integrity
```bash
# Run after rollover operations
npm run db:audit
```

#### Rollover Logs
- All rollover operations logged with timestamps
- Success/failure counts tracked
- Client-specific processing logged

## 📈 Performance Considerations

### Batch Processing
- Process workflows in batches of 10
- Avoid overwhelming database connections
- Use transactions for consistency

### Caching
- Cache Companies House data lookups
- Minimize API calls during rollover
- Use database indexes for performance

### Monitoring
- Track rollover execution time
- Monitor database connection usage
- Alert on rollover failures

## 🔮 Future Enhancements

### Phase 2 Features
1. **Smart Assignment**
   - AI-based workload balancing
   - Historical performance analysis
   - Skill-based assignment

2. **Notification System**
   - Email alerts for new workflows
   - Slack integration for team updates
   - Dashboard notifications

3. **Rollover Analytics**
   - Rollover success rates
   - Processing time metrics
   - Workflow completion trends

4. **Advanced Scheduling**
   - Custom rollover timing per client
   - Holiday-aware scheduling
   - Priority-based processing

### Integration Opportunities
- **Companies House API**: Real-time data sync
- **HMRC API**: Filing status verification
- **Calendar Systems**: Deadline integration
- **CRM Systems**: Client communication

## 📋 Maintenance

### Regular Tasks
- **Monthly**: Review rollover logs
- **Quarterly**: Validate Companies House data accuracy
- **Annually**: Review rollover timing and logic

### Updates Required
- **Enum Changes**: Update UI components
- **Schema Changes**: Run safe migrations
- **Logic Changes**: Update documentation

## 🔒 Security Considerations

### Data Protection
- All rollover operations logged for audit
- No sensitive data in rollover scripts
- Secure database connections required

### Access Control
- Rollover scripts require system-level access
- Manual rollover requires MANAGER+ role
- Audit trail for all operations

---

## 📞 Support

For issues with the rollover system:
1. Check rollover logs in database
2. Verify enum values with `node scripts/check-enum-values.js`
3. Run demo script to test functionality
4. Contact development team for complex issues

**Last Updated**: June 26, 2025
**Version**: 1.0.0
**Status**: Implemented and Ready for Production 