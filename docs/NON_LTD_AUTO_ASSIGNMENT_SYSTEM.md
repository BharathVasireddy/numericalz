# Non-Ltd Auto-Assignment System Documentation

## Overview

The Non-Ltd Auto-Assignment System automatically creates and assigns the next workflow when a non-Ltd company workflow is marked as "Filed to HMRC". This ensures continuity in client management and eliminates the need for manual reassignment every period.

## 🎯 Business Logic

### When Auto-Assignment Triggers
- **Trigger**: Non-Ltd workflow stage is updated to `"FILED_TO_HMRC"`
- **Action**: System automatically creates/assigns next year's workflow
- **Assignment**: Next workflow assigned to the same user who completed the current workflow
- **Status**: Next workflow starts with `"WAITING_FOR_YEAR_END"` status

### Why This Makes Sense
- **Continuity**: Same staff member continues handling the client
- **Efficiency**: No need for manual reassignment every period
- **Transparency**: Dashboard and filters always show correct assignee
- **Business Logic**: Matches real-world accounting firm operations

## 🔧 Technical Implementation

### Location
- **File**: `app/api/clients/non-ltd-deadlines/[id]/workflow/route.ts`
- **Function**: `PUT` method (workflow stage updates)
- **Trigger**: When `validatedData.currentStage === 'FILED_TO_HMRC'`

### Auto-Assignment Logic

```typescript
// 🎯 AUTO-ASSIGNMENT LOGIC: Create and assign next workflow when marked as "FILED_TO_HMRC"
if (validatedData.currentStage === 'FILED_TO_HMRC') {
  // Calculate next year's dates (non-ltd companies have fixed dates)
  const currentYearEnd = new Date(currentWorkflow.yearEndDate)
  const nextYear = currentYearEnd.getFullYear() + 1
  
  // Non-ltd companies: Year end always April 5th, filing due always January 5th
  const nextYearEnd = new Date(nextYear, 3, 5) // April 5th next year
  const nextFilingDue = new Date(nextYear + 1, 0, 5) // January 5th year after next

  // Check if workflow for next year already exists
  const existingNextWorkflow = await db.nonLtdAccountsWorkflow.findFirst({
    where: {
      clientId: clientId,
      yearEndDate: nextYearEnd
    }
  })

  if (!existingNextWorkflow) {
    // Create new workflow for next year
    const newWorkflow = await db.nonLtdAccountsWorkflow.create({
      data: {
        clientId: clientId,
        yearEndDate: nextYearEnd,
        filingDueDate: nextFilingDue,
        currentStage: 'WAITING_FOR_YEAR_END',
        isCompleted: false,
        // Auto-assign to the same user who completed the current workflow
        assignedUserId: currentWorkflow.assignedUserId
      }
    })
  } else {
    // Workflow exists but might be unassigned - assign it to the same user
    if (!existingNextWorkflow.assignedUserId && currentWorkflow.assignedUserId) {
      await db.nonLtdAccountsWorkflow.update({
        where: { id: existingNextWorkflow.id },
        data: { assignedUserId: currentWorkflow.assignedUserId }
      })
    }
  }
}
```

## 📅 Date Calculations

### Non-Ltd Company Date Rules
- **Year End**: Always April 5th of the year
- **Filing Due**: Always January 5th of the following year
- **Example**: 2025 year end = April 5, 2025, filing due = January 5, 2026

### Next Workflow Dates
```typescript
const currentYearEnd = new Date(currentWorkflow.yearEndDate)
const nextYear = currentYearEnd.getFullYear() + 1
const nextYearEnd = new Date(nextYear, 3, 5) // April 5th next year
const nextFilingDue = new Date(nextYear + 1, 0, 5) // January 5th year after next
```

## 🔄 Edge Cases Handled

### 1. Existing Next Workflow
- **Scenario**: Next year's workflow already exists
- **Action**: Check if it's unassigned and assign to current user
- **Skip**: If already assigned, do nothing

### 2. No Current Assignment
- **Scenario**: Current workflow has no assigned user
- **Action**: Create next workflow without assignment
- **Result**: Next workflow starts unassigned

### 3. User Deactivation
- **Scenario**: User who completed workflow is no longer active
- **Action**: Create next workflow without assignment
- **Result**: Next workflow starts unassigned (can be manually assigned later)

## 📊 Activity Logging

### Log Entries Created
The system logs all auto-assignment activities for audit trail:

#### New Workflow Created
```typescript
action: 'NON_LTD_NEXT_WORKFLOW_AUTO_ASSIGNED'
details: {
  companyName: 'Client Name',
  clientCode: 'NZ-X',
  workflowType: 'NON_LTD',
  nextFilingPeriod: '2026 accounts',
  autoAssignedTo: 'User Name',
  autoAssignedToId: 'user-id',
  nextYearEndDate: '2026-04-05',
  nextFilingDueDate: '2027-01-05',
  comments: 'Next workflow auto-created and assigned to User Name after filing completion',
  completedBy: 'User who marked as filed'
}
```

#### Existing Workflow Assigned
```typescript
action: 'NON_LTD_EXISTING_WORKFLOW_AUTO_ASSIGNED'
details: {
  // Similar to above but for existing workflows
  comments: 'Existing next workflow auto-assigned to User Name after filing completion'
}
```

## 🧪 Testing

### Test Script
- **File**: `scripts/test-non-ltd-auto-assignment.js`
- **Purpose**: Verify auto-assignment logic works correctly
- **Usage**: `node scripts/test-non-ltd-auto-assignment.js`

### Test Scenarios
1. **New Workflow Creation**: No next workflow exists
2. **Existing Workflow Assignment**: Next workflow exists but unassigned
3. **Already Assigned**: Next workflow exists and already assigned
4. **No Current Assignment**: Current workflow has no assignee

## 🎯 Dashboard Impact

### Widget Behavior
- **Unassigned Clients Widget**: Will show correct counts after auto-assignment
- **User Filter**: Will include auto-assigned workflows in user's workload
- **Assignment Display**: Table will show correct assignee for next workflow

### Expected Results
- **Before Filing**: Client appears in unassigned widget (if no next workflow)
- **After Filing**: Client appears in assigned user's workload (next workflow assigned)
- **Filter Behavior**: User filter will show the client correctly

## 🔒 Error Handling

### Graceful Degradation
- **Database Errors**: Don't fail main operation, log error and continue
- **Missing Data**: Handle null/undefined values safely
- **Transaction Safety**: Auto-assignment doesn't affect main workflow update

### Error Logging
```typescript
catch (autoAssignmentError) {
  console.error('❌ Error during auto-assignment of next workflow:', autoAssignmentError)
  // Don't fail the main operation, just log the error
}
```

## 📋 Configuration

### Environment Variables
- No specific environment variables required
- Uses existing database connection and authentication

### Dependencies
- Prisma Client for database operations
- Activity logging system for audit trail
- Existing workflow validation and notification systems

## 🔄 Rollback Support

### Undo Operations
When a workflow is undone from "FILED_TO_HMRC":
- **Cleanup**: Orphaned next workflow is automatically deleted
- **Logging**: Specific undo activity is logged
- **Safety**: No data loss or orphaned records

### Undo Logic
```typescript
// Clean up orphaned workflow created during rollover
const orphanedWorkflow = await db.nonLtdAccountsWorkflow.findFirst({
  where: {
    clientId: clientId,
    yearEndDate: nextYearEnd,
    isCompleted: false,
    currentStage: 'WAITING_FOR_YEAR_END'
  }
})

if (orphanedWorkflow) {
  await db.nonLtdAccountsWorkflowHistory.deleteMany({
    where: { nonLtdAccountsWorkflowId: orphanedWorkflow.id }
  })
  
  await db.nonLtdAccountsWorkflow.delete({
    where: { id: orphanedWorkflow.id }
  })
}
```

## 🎯 Benefits

### For Staff
- **Continuity**: Same person continues handling client
- **Efficiency**: No manual reassignment needed
- **Clarity**: Clear ownership of next period work

### For Management
- **Transparency**: Complete audit trail of assignments
- **Consistency**: Standardized assignment process
- **Compliance**: Proper logging for regulatory requirements

### For System
- **Reliability**: Automated process reduces human error
- **Scalability**: Handles multiple clients efficiently
- **Maintainability**: Clear, documented logic

## 📚 Related Documentation

- [VAT Assignment System](./VAT_ASSIGNMENT_SYSTEM_CLEANUP.md)
- [Workflow Management](./WORKFLOW_MANAGEMENT.md)
- [Activity Logging](./ACTIVITY_LOGGING.md)
- [Database Schema](./DATABASE_SCHEMA.md)

## 🔧 Maintenance

### Monitoring
- Check activity logs for auto-assignment events
- Monitor for any error patterns in auto-assignment
- Verify dashboard widget accuracy

### Updates
- Date calculation logic may need updates for regulatory changes
- Assignment rules can be modified based on business requirements
- Logging format can be enhanced for additional audit requirements

---

**Last Updated**: July 2025  
**Version**: 1.0  
**Author**: Numericalz Development Team 