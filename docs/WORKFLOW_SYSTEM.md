# Workflow System Documentation

## 🎯 Overview

The Numericalz Workflow System is a comprehensive 10-stage process management system designed for UK accounting firms. It standardizes the workflow for all services (Accounts, VAT, PAYE) while providing role-based access control and automation capabilities.

## 📋 10-Stage Workflow Process

### Stage 1: Paperwork to Chase
**Role Access**: Partner, Manager  
**Description**: Initial stage where paperwork needs to be requested from client  
**Actions Available**:
- Mark as "Paperwork Chased" (advance to Stage 2)
- Add notes about required documents
- Set chase deadline
- Assign staff member for when paperwork is received

**Automation**: 
- Triggered automatically based on service type:
  - **Accounts**: Day after year-end date passes
  - **VAT**: Based on frequency pattern (monthly/quarterly)

### Stage 2: Paperwork Chased
**Role Access**: Partner, Manager  
**Description**: Paperwork has been requested, waiting for client response  
**Actions Available**:
- Mark as "Paperwork Received" (advance to Stage 3)
- Send follow-up chase
- Add notes about client communication
- Update deadline

**Manual Update**: This stage requires manual confirmation that paperwork has been received

### Stage 3: Paperwork Received
**Role Access**: All roles (automatic assignment to Staff)  
**Description**: Paperwork received, automatically assigned to staff member  
**Actions Available**:
- Mark as "In Progress" (advance to Stage 4)
- Reassign to different staff member
- Add notes about received documents
- Upload received files

**Automation**: Automatically assigns to designated staff member when advanced from Stage 2

### Stage 4: In Progress
**Role Access**: Primarily Staff, Manager oversight  
**Description**: Staff member actively working on the client's requirements  
**Actions Available**:
- Mark as "Ready for Manager Review" (advance to Stage 5)
- Add work progress notes
- Upload work-in-progress files
- Request manager assistance

**Time Tracking**: System tracks time spent in this stage for workload analysis

### Stage 5: Discuss with Manager
**Role Access**: Manager (primary), Staff (limited)  
**Description**: Manager reviews work and decides next action  
**Actions Available**:
- **Send Back to Stage 4**: Work needs more attention
- **Advance to Stage 6**: Ready for partner review
- Add review notes
- Provide feedback to staff

**Decision Point**: Manager can send work back or forward based on quality review

### Stage 6: Review by Partner
**Role Access**: Partner (primary), Manager (limited)  
**Description**: Partner final review before client approval  
**Actions Available**:
- **Send Back to Stage 4 or 5**: Work needs revision
- **Advance to Stage 7**: Approved for client signing
- Add partner review notes
- Request changes

**Quality Gate**: Final internal approval before client interaction

### Stage 7: Approved - Send HelloSign
**Role Access**: Partner, Manager  
**Description**: Work approved, ready to send to client for signature  
**Actions Available**:
- Trigger HelloSign document creation
- Select document templates
- Add client-specific notes
- Send for signature

**Automation**: Automatically triggers HelloSign integration when advanced to this stage

### Stage 8: HelloSign Sent to Client
**Role Access**: All roles (view only)  
**Description**: Documents sent to client, waiting for signature  
**Actions Available**:
- View HelloSign status
- Send reminder to client
- Add follow-up notes
- Cancel/resend if needed

**External Integration**: Status updates automatically from HelloSign webhook

### Stage 9: Approved by Client
**Role Access**: All roles (view only)  
**Description**: Client has signed documents, ready for final submission  
**Actions Available**:
- View signed documents
- Prepare for submission
- Add completion notes
- Advance to final stage

**Automation**: Automatically advanced when HelloSign reports completion

### Stage 10: Submission Approved by Partner
**Role Access**: Partner (primary)  
**Description**: Final approval and workflow completion  
**Actions Available**:
- Mark workflow as complete
- Add final submission notes
- Archive workflow
- Generate completion report

**Workflow Completion**: Marks the service workflow as completed

## 🔐 Role-Based Access Control

### Partner Role
- **Full Access**: Can view and modify all stages (1-10)
- **Special Permissions**:
  - Can send work back from any stage
  - Can override stage restrictions
  - Can complete workflows (Stage 10)
  - Can access all client services

### Manager Role
- **Primary Access**: Stages 1-6
- **Limited Access**: Stages 7-10 (view only, limited actions)
- **Special Permissions**:
  - Can assign staff to clients
  - Can send work back to Stage 4 from Stage 5
  - Can trigger HelloSign (Stage 7)
  - Can view team workload

### Staff Role
- **Primary Access**: Stages 3-5
- **Limited Access**: Other stages (view only)
- **Special Permissions**:
  - Can update work progress
  - Can request manager review
  - Can view assigned client workflows only
  - Can add work notes and upload files

## 🔄 Workflow State Machine

### Valid Transitions

```
Stage 1 → Stage 2 (Partner/Manager action)
Stage 2 → Stage 3 (Partner/Manager action)
Stage 3 → Stage 4 (Staff action)
Stage 4 → Stage 5 (Staff action)
Stage 5 → Stage 4 (Manager send-back)
Stage 5 → Stage 6 (Manager approval)
Stage 6 → Stage 4 (Partner send-back)
Stage 6 → Stage 5 (Partner send-back)
Stage 6 → Stage 7 (Partner approval)
Stage 7 → Stage 8 (HelloSign trigger)
Stage 8 → Stage 9 (HelloSign completion)
Stage 9 → Stage 10 (Partner action)
```

### Business Rules

1. **No Skipping Stages**: Must progress through stages sequentially
2. **Role Validation**: Only authorized roles can perform specific actions
3. **Send-Back Rules**: 
   - From Stage 5: Can only send back to Stage 4
   - From Stage 6: Can send back to Stage 4 or 5
4. **Automation Points**: Stages 3, 7, 8, 9 have automatic triggers
5. **Completion Rule**: Only Stage 10 marks workflow as complete

## 📊 Parallel Service Management

### Multi-Service Clients

A single client can have multiple services running simultaneously:

```
Client: ABC Ltd
├── Accounts Service (Stage 5 - Manager Review)
├── VAT Service (Stage 3 - Staff Working)
└── PAYE Service (Stage 1 - Chase Paperwork)
```

### Independent Workflows

- Each service maintains its own workflow state
- Different staff can be assigned to different services
- Services progress independently
- Separate deadlines and tracking per service

### Service Assignment

```typescript
// Example service assignments
{
  client_id: "abc-ltd",
  services: [
    {
      service_type: "ACCOUNTS_LTD",
      assigned_staff: "john.doe",
      current_stage: 5,
      workflow_data: { year_end: "2024-03-31" }
    },
    {
      service_type: "VAT",
      assigned_staff: "jane.smith", 
      current_stage: 3,
      workflow_data: { frequency: "QUARTERLY_1", due_date: "2024-01-31" }
    }
  ]
}
```

## 🤖 Automation System

### Automatic Workflow Creation

#### Accounts Service Triggers
```typescript
// Triggered day after year-end date
if (client.accounting_reference_date < today) {
  createWorkflow({
    client_id: client.id,
    service_type: "ACCOUNTS_LTD",
    trigger_date: client.accounting_reference_date + 1,
    due_date: client.accounts_due_date
  });
}
```

#### VAT Service Triggers
```typescript
// Triggered based on frequency pattern
const vatFrequencies = {
  MONTHLY: "every month",
  QUARTERLY_1: [1, 4, 7, 10], // Jan, Apr, Jul, Oct
  QUARTERLY_2: [2, 5, 8, 11], // Feb, May, Aug, Nov  
  QUARTERLY_3: [3, 6, 9, 12]  // Mar, Jun, Sep, Dec
};
```

### Stage Automation Rules

1. **Stage 3 Auto-Assignment**: When advanced from Stage 2, automatically assigns to designated staff
2. **Stage 7 HelloSign Trigger**: Automatically creates HelloSign document when advanced
3. **Stage 8 Status Updates**: Automatically updates from HelloSign webhooks
4. **Stage 9 Completion**: Automatically advances when HelloSign reports completion

## 📧 Notification System

### Email Notifications

#### Stage Transitions
- **Stage 1→2**: Notify assigned staff that paperwork has been chased
- **Stage 2→3**: Notify staff that paperwork received and assigned
- **Stage 3→4**: Notify manager that work has started
- **Stage 4→5**: Notify manager that review is needed
- **Stage 5→6**: Notify partner that final review is needed
- **Stage 6→7**: Notify admin that HelloSign should be sent
- **Stage 7→8**: Notify client that documents are ready for signature
- **Stage 8→9**: Notify team that client has signed
- **Stage 9→10**: Notify partner that final approval is needed

#### Deadline Notifications
- **7 days before**: Warning notification
- **3 days before**: Urgent notification
- **Day of deadline**: Critical notification
- **Overdue**: Daily overdue notifications

### In-App Notifications

- Real-time notifications for stage changes
- Workload alerts for staff assignments
- Deadline reminders in dashboard
- Activity feed updates

## 📈 Activity Logging & Audit Trail

### Workflow History Tracking

Every workflow action is logged with:

```typescript
{
  client_service_id: string,
  from_stage: number,
  to_stage: number,
  action_by_user_id: string,
  action_type: "ADVANCE" | "SEND_BACK" | "ASSIGN" | "NOTE",
  notes: string,
  created_at: timestamp,
  metadata: {
    reason?: string,
    files_uploaded?: string[],
    deadline_changed?: boolean,
    notification_sent?: boolean
  }
}
```

### Activity Types

1. **Stage Transitions**: All workflow progressions
2. **Assignments**: Staff assignments and changes
3. **File Uploads**: Document attachments
4. **Notes**: Work progress and communication notes
5. **Deadline Changes**: Due date modifications
6. **External Events**: HelloSign status updates

### Audit Compliance

- **Immutable Records**: Activity logs cannot be modified
- **Complete Timeline**: Every action is timestamped and tracked
- **User Attribution**: All actions linked to specific users
- **Data Retention**: Configurable retention policies
- **Export Capability**: Audit trails can be exported for compliance

## 🔧 Technical Implementation

### Database Schema

```sql
-- Workflow states
CREATE TYPE workflow_stage AS ENUM (
  'PAPERWORK_TO_CHASE',
  'PAPERWORK_CHASED', 
  'PAPERWORK_RECEIVED',
  'IN_PROGRESS',
  'DISCUSS_WITH_MANAGER',
  'REVIEW_BY_PARTNER',
  'APPROVED_SEND_HELLOSIGN',
  'HELLOSIGN_SENT',
  'APPROVED_BY_CLIENT',
  'SUBMISSION_APPROVED'
);

-- Service types
CREATE TYPE service_type AS ENUM (
  'ACCOUNTS_LTD',
  'ACCOUNTS_NON_LTD',
  'VAT',
  'PAYE'
);

-- Workflow actions
CREATE TYPE workflow_action AS ENUM (
  'ADVANCE',
  'SEND_BACK',
  'ASSIGN',
  'NOTE',
  'UPLOAD',
  'DEADLINE_CHANGE'
);
```

### API Endpoints

```typescript
// Workflow management
POST /api/workflows/advance
POST /api/workflows/send-back
POST /api/workflows/assign
GET  /api/workflows/[clientId]/[serviceType]
GET  /api/workflows/history/[workflowId]

// Bulk operations
POST /api/workflows/bulk-advance
POST /api/workflows/bulk-assign

// Automation
POST /api/workflows/trigger-automation
GET  /api/workflows/automation-status
```

### State Machine Implementation

```typescript
class WorkflowStateMachine {
  validateTransition(from: Stage, to: Stage, userRole: Role): boolean
  executeTransition(workflowId: string, action: WorkflowAction): Promise<void>
  canUserAccess(stage: Stage, userRole: Role): boolean
  getAvailableActions(stage: Stage, userRole: Role): Action[]
}
```

## 📊 Performance Considerations

### Database Optimization

- **Indexes**: On client_id, service_type, current_stage, assigned_staff_id
- **Partitioning**: Workflow history by date ranges
- **Caching**: Frequently accessed workflow states
- **Pagination**: Large workflow lists with efficient pagination

### Real-Time Updates

- **WebSocket Connections**: Live workflow status updates
- **Event Broadcasting**: Stage transition notifications
- **Optimistic Updates**: UI updates before server confirmation
- **Conflict Resolution**: Handle concurrent workflow modifications

## 🧪 Testing Strategy

### Unit Tests
- Workflow state machine logic
- Role-based permission checks
- Automation trigger conditions
- Notification generation

### Integration Tests
- Complete workflow progressions
- Multi-service client scenarios
- HelloSign integration flows
- Email notification delivery

### End-to-End Tests
- Full user journeys through workflows
- Cross-role collaboration scenarios
- Automation and trigger testing
- Performance under load

## 🚀 Future Enhancements

### Advanced Features
- **Custom Workflow Builder**: User-defined workflow stages
- **AI-Powered Insights**: Workflow optimization suggestions
- **Advanced Analytics**: Performance metrics and bottleneck analysis
- **Mobile Workflow Management**: Native mobile app for workflow actions

### Integration Opportunities
- **Document Management**: Integration with cloud storage providers
- **Communication Tools**: Slack/Teams integration for notifications
- **Accounting Software**: Direct integration with Xero, QuickBooks, Sage
- **CRM Systems**: Client relationship management integration

---

This workflow system provides a robust, scalable foundation for managing complex accounting firm processes while maintaining flexibility for future enhancements and customizations. 