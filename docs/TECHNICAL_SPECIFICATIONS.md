# Technical Specifications - Multi-Service Workflow System

## 🎯 System Overview

This document provides detailed technical specifications for implementing the multi-service workflow system in the Numericalz Internal Management System.

## 🏗️ Architecture Components

### Core System Components

```typescript
// Core service management interfaces
interface ServiceManager {
  createService(clientId: string, serviceType: ServiceType, config: ServiceConfig): Promise<ClientService>;
  getClientServices(clientId: string, filters?: ServiceFilters): Promise<ClientService[]>;
  updateServiceStage(serviceId: string, newStage: number, userId: string): Promise<WorkflowTransition>;
  assignStaffToService(serviceId: string, staffId: string): Promise<void>;
  suspendService(serviceId: string, reason: string): Promise<void>;
  completeService(serviceId: string): Promise<void>;
}

interface WorkflowEngine {
  advanceWorkflow(serviceId: string, userId: string, notes?: string): Promise<WorkflowTransition>;
  sendBackWorkflow(serviceId: string, targetStage: number, userId: string, reason: string): Promise<WorkflowTransition>;
  validateTransition(serviceId: string, fromStage: number, toStage: number, userRole: UserRole): Promise<boolean>;
  getAvailableActions(serviceId: string, userRole: UserRole): Promise<WorkflowAction[]>;
}

interface AutomationEngine {
  registerTrigger(trigger: WorkflowTrigger): Promise<void>;
  checkTriggers(): Promise<TriggerResult[]>;
  createAutomaticWorkflow(clientId: string, serviceType: ServiceType, triggerData: any): Promise<ClientService>;
  scheduleRecurringTriggers(): Promise<void>;
}
```

## 📊 Database Schema Specifications

### Primary Tables

#### client_services Table
```sql
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type service_type_enum NOT NULL,
  status service_status_enum DEFAULT 'ACTIVE' NOT NULL,
  current_stage INTEGER DEFAULT 1 NOT NULL CHECK (current_stage >= 1 AND current_stage <= 10),
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workflow_data JSONB NOT NULL DEFAULT '{}',
  deadline DATE,
  priority priority_enum DEFAULT 'MEDIUM',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspension_reason TEXT,
  
  -- Constraints
  CONSTRAINT unique_active_service_per_client UNIQUE(client_id, service_type) 
    WHERE status IN ('ACTIVE', 'SUSPENDED'),
  CONSTRAINT valid_completion_date CHECK (
    (status = 'COMPLETED' AND completed_at IS NOT NULL AND current_stage = 10) OR
    (status != 'COMPLETED' AND completed_at IS NULL)
  ),
  CONSTRAINT valid_suspension CHECK (
    (status = 'SUSPENDED' AND suspended_at IS NOT NULL AND suspension_reason IS NOT NULL) OR
    (status != 'SUSPENDED' AND suspended_at IS NULL AND suspension_reason IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_client_services_client_id ON client_services(client_id);
CREATE INDEX idx_client_services_service_type ON client_services(service_type);
CREATE INDEX idx_client_services_assigned_staff ON client_services(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;
CREATE INDEX idx_client_services_status ON client_services(status);
CREATE INDEX idx_client_services_stage ON client_services(current_stage);
CREATE INDEX idx_client_services_deadline ON client_services(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_client_services_active_workload ON client_services(assigned_staff_id, status, current_stage) 
  WHERE status = 'ACTIVE';
```

#### workflow_history Table
```sql
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  from_stage INTEGER,
  to_stage INTEGER NOT NULL,
  action_by_user_id UUID NOT NULL REFERENCES users(id),
  action_type workflow_action_enum NOT NULL,
  notes TEXT,
  files_attached TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_stage_transition CHECK (
    (from_stage IS NULL AND to_stage = 1) OR -- Initial creation
    (from_stage IS NOT NULL AND from_stage != to_stage) -- Valid transition
  ),
  CONSTRAINT valid_stage_range CHECK (
    (from_stage IS NULL OR (from_stage >= 1 AND from_stage <= 10)) AND
    (to_stage >= 1 AND to_stage <= 10)
  )
);

-- Indexes for audit and performance
CREATE INDEX idx_workflow_history_client_service ON workflow_history(client_service_id);
CREATE INDEX idx_workflow_history_user ON workflow_history(action_by_user_id);
CREATE INDEX idx_workflow_history_created_at ON workflow_history(created_at);
CREATE INDEX idx_workflow_history_action_type ON workflow_history(action_type);
CREATE INDEX idx_workflow_history_timeline ON workflow_history(client_service_id, created_at);
```

#### service_triggers Table
```sql
CREATE TABLE service_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type service_type_enum NOT NULL,
  trigger_type trigger_type_enum NOT NULL,
  trigger_date DATE NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_active_trigger UNIQUE(client_id, service_type, trigger_date) 
    WHERE is_active = true,
  CONSTRAINT valid_execution CHECK (
    (executed_at IS NULL AND is_active = true) OR
    (executed_at IS NOT NULL)
  )
);

-- Indexes for trigger processing
CREATE INDEX idx_service_triggers_date ON service_triggers(trigger_date) WHERE is_active = true;
CREATE INDEX idx_service_triggers_client ON service_triggers(client_id);
CREATE INDEX idx_service_triggers_type ON service_triggers(service_type);
CREATE INDEX idx_service_triggers_active ON service_triggers(is_active, trigger_date);
```

### Enumeration Types

```sql
-- Service types
CREATE TYPE service_type_enum AS ENUM (
  'ACCOUNTS_LTD',
  'ACCOUNTS_NON_LTD',
  'VAT',
  'PAYE',
  'PENSION',
  'CIS'
);

-- Service status
CREATE TYPE service_status_enum AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'SUSPENDED',
  'CANCELLED'
);

-- Workflow actions
CREATE TYPE workflow_action_enum AS ENUM (
  'CREATE',
  'ADVANCE',
  'SEND_BACK',
  'ASSIGN',
  'REASSIGN',
  'NOTE',
  'UPLOAD',
  'DEADLINE_CHANGE',
  'SUSPEND',
  'RESUME',
  'COMPLETE',
  'CANCEL'
);

-- Priority levels
CREATE TYPE priority_enum AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Trigger types
CREATE TYPE trigger_type_enum AS ENUM (
  'DATE_BASED',
  'FREQUENCY_BASED',
  'MANUAL',
  'EXTERNAL_EVENT'
);

-- VAT frequency patterns
CREATE TYPE vat_frequency_enum AS ENUM (
  'MONTHLY',
  'QUARTERLY_1',  -- Jan, Apr, Jul, Oct
  'QUARTERLY_2',  -- Feb, May, Aug, Nov
  'QUARTERLY_3'   -- Mar, Jun, Sep, Dec
);

-- VAT schemes
CREATE TYPE vat_scheme_enum AS ENUM (
  'STANDARD',
  'FLAT_RATE',
  'CASH_ACCOUNTING',
  'ANNUAL_ACCOUNTING'
);

-- Business types
CREATE TYPE business_type_enum AS ENUM (
  'LIMITED_COMPANY',
  'PARTNERSHIP',
  'SOLE_TRADER',
  'LLP',
  'CHARITY',
  'OTHER'
);
```

## 🔧 API Specifications

### Service Management Endpoints

#### Create Service
```typescript
POST /api/services
Content-Type: application/json

{
  "client_id": "uuid",
  "service_type": "ACCOUNTS_LTD" | "ACCOUNTS_NON_LTD" | "VAT",
  "config": {
    // Service-specific configuration
    "vat_frequency"?: "MONTHLY" | "QUARTERLY_1" | "QUARTERLY_2" | "QUARTERLY_3",
    "accounting_reference_date"?: "2024-03-31",
    "deadline"?: "2024-12-31"
  },
  "assigned_staff_id"?: "uuid"
}

Response: {
  "success": true,
  "data": {
    "id": "uuid",
    "client_id": "uuid",
    "service_type": "ACCOUNTS_LTD",
    "status": "ACTIVE",
    "current_stage": 1,
    "assigned_staff_id": "uuid",
    "deadline": "2024-12-31",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Get Client Services
```typescript
GET /api/clients/{clientId}/services?status=ACTIVE&include=workflow_history

Response: {
  "success": true,
  "data": [
    {
      "id": "uuid",
      "service_type": "ACCOUNTS_LTD",
      "status": "ACTIVE",
      "current_stage": 5,
      "assigned_staff": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "deadline": "2024-12-31",
      "workflow_history": [
        {
          "from_stage": 4,
          "to_stage": 5,
          "action_by_user": {
            "name": "John Doe"
          },
          "action_type": "ADVANCE",
          "created_at": "2024-01-15T10:00:00Z"
        }
      ]
    }
  ]
}
```

### Workflow Management Endpoints

#### Advance Workflow
```typescript
POST /api/workflows/{serviceId}/advance
Content-Type: application/json

{
  "notes"?: "Work completed, ready for manager review",
  "files"?: ["file1.pdf", "file2.xlsx"]
}

Response: {
  "success": true,
  "data": {
    "service_id": "uuid",
    "from_stage": 4,
    "to_stage": 5,
    "action_type": "ADVANCE",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Send Back Workflow
```typescript
POST /api/workflows/{serviceId}/send-back
Content-Type: application/json

{
  "target_stage": 4,
  "reason": "Additional information required",
  "notes": "Please review the VAT calculations"
}

Response: {
  "success": true,
  "data": {
    "service_id": "uuid",
    "from_stage": 5,
    "to_stage": 4,
    "action_type": "SEND_BACK",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### Automation Endpoints

#### Trigger Automation Check
```typescript
POST /api/automation/check-triggers

Response: {
  "success": true,
  "data": {
    "triggers_checked": 150,
    "workflows_created": 12,
    "notifications_sent": 25,
    "execution_time_ms": 1250
  }
}
```

#### Get Automation Status
```typescript
GET /api/automation/status

Response: {
  "success": true,
  "data": {
    "last_check": "2024-01-15T09:00:00Z",
    "next_check": "2024-01-16T09:00:00Z",
    "active_triggers": 45,
    "pending_workflows": 8
  }
}
```

## 🔄 Workflow State Machine

### State Transition Rules

```typescript
interface WorkflowRules {
  [stage: number]: {
    allowedRoles: UserRole[];
    canAdvanceTo: number[];
    canSendBackTo: number[];
    autoTriggers?: AutoTrigger[];
    validations?: ValidationRule[];
  };
}

const workflowRules: WorkflowRules = {
  1: { // Paperwork to chase
    allowedRoles: ['PARTNER', 'MANAGER'],
    canAdvanceTo: [2],
    canSendBackTo: [],
    validations: ['hasDeadline', 'hasAssignedStaff']
  },
  2: { // Paperwork chased
    allowedRoles: ['PARTNER', 'MANAGER'],
    canAdvanceTo: [3],
    canSendBackTo: [1],
    autoTriggers: ['assignToStaff']
  },
  3: { // Paperwork received
    allowedRoles: ['PARTNER', 'MANAGER', 'STAFF'],
    canAdvanceTo: [4],
    canSendBackTo: [2],
    validations: ['hasRequiredDocuments']
  },
  4: { // In progress
    allowedRoles: ['STAFF', 'MANAGER'],
    canAdvanceTo: [5],
    canSendBackTo: [3],
    validations: ['workCompleted']
  },
  5: { // Discuss with manager
    allowedRoles: ['MANAGER', 'PARTNER'],
    canAdvanceTo: [6],
    canSendBackTo: [4],
    validations: ['managerApproval']
  },
  6: { // Review by partner
    allowedRoles: ['PARTNER'],
    canAdvanceTo: [7],
    canSendBackTo: [4, 5],
    validations: ['partnerApproval']
  },
  7: { // Approved - Send HelloSign
    allowedRoles: ['PARTNER', 'MANAGER'],
    canAdvanceTo: [8],
    canSendBackTo: [6],
    autoTriggers: ['createHelloSignRequest']
  },
  8: { // HelloSign sent to client
    allowedRoles: [], // Auto-managed
    canAdvanceTo: [9],
    canSendBackTo: [7],
    autoTriggers: ['monitorHelloSignStatus']
  },
  9: { // Approved by client
    allowedRoles: ['PARTNER'],
    canAdvanceTo: [10],
    canSendBackTo: [7],
    validations: ['clientSignatureComplete']
  },
  10: { // Submission approved by partner
    allowedRoles: ['PARTNER'],
    canAdvanceTo: [],
    canSendBackTo: [9],
    autoTriggers: ['markAsComplete', 'generateCompletionReport']
  }
};
```

### Validation Rules

```typescript
interface ValidationRule {
  name: string;
  validator: (service: ClientService, context: ValidationContext) => Promise<ValidationResult>;
}

const validationRules: ValidationRule[] = [
  {
    name: 'hasDeadline',
    validator: async (service, context) => {
      if (!service.deadline) {
        return { valid: false, message: 'Service deadline is required' };
      }
      return { valid: true };
    }
  },
  {
    name: 'hasAssignedStaff',
    validator: async (service, context) => {
      if (!service.assigned_staff_id) {
        return { valid: false, message: 'Staff assignment is required' };
      }
      return { valid: true };
    }
  },
  {
    name: 'workCompleted',
    validator: async (service, context) => {
      const workItems = await getWorkItems(service.id);
      const completedItems = workItems.filter(item => item.status === 'COMPLETED');
      
      if (completedItems.length < workItems.length) {
        return { valid: false, message: 'All work items must be completed' };
      }
      return { valid: true };
    }
  }
];
```

## 🤖 Automation System

### Trigger Engine Implementation

```typescript
class TriggerEngine {
  async processTriggers(): Promise<TriggerResult[]> {
    const activeTriggers = await this.getActiveTriggers();
    const results: TriggerResult[] = [];
    
    for (const trigger of activeTriggers) {
      try {
        const result = await this.processTrigger(trigger);
        results.push(result);
        
        if (result.success) {
          await this.markTriggerExecuted(trigger.id);
        }
      } catch (error) {
        results.push({
          trigger_id: trigger.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  private async processTrigger(trigger: ServiceTrigger): Promise<TriggerResult> {
    const handler = this.getTriggerHandler(trigger.trigger_type);
    return await handler.execute(trigger);
  }
  
  private getTriggerHandler(triggerType: TriggerType): TriggerHandler {
    switch (triggerType) {
      case 'DATE_BASED':
        return new DateBasedTriggerHandler();
      case 'FREQUENCY_BASED':
        return new FrequencyBasedTriggerHandler();
      default:
        throw new Error(`Unsupported trigger type: ${triggerType}`);
    }
  }
}

class DateBasedTriggerHandler implements TriggerHandler {
  async execute(trigger: ServiceTrigger): Promise<TriggerResult> {
    const today = new Date();
    
    if (trigger.trigger_date <= today) {
      const service = await this.createWorkflowForTrigger(trigger);
      
      return {
        trigger_id: trigger.id,
        success: true,
        workflow_created: service.id,
        message: `Workflow created for ${trigger.service_type}`
      };
    }
    
    return {
      trigger_id: trigger.id,
      success: false,
      message: 'Trigger date not reached'
    };
  }
}
```

### Scheduled Jobs Configuration

```typescript
// Cron job definitions
const scheduledJobs = {
  // Daily automation check at 9 AM
  dailyTriggerCheck: {
    schedule: '0 9 * * *',
    handler: async () => {
      const triggerEngine = new TriggerEngine();
      const results = await triggerEngine.processTriggers();
      await logTriggerResults(results);
    }
  },
  
  // Weekly workload rebalancing on Mondays at 9 AM
  weeklyWorkloadBalance: {
    schedule: '0 9 * * 1',
    handler: async () => {
      const workloadBalancer = new WorkloadBalancer();
      await workloadBalancer.rebalanceTeamWorkload();
    }
  },
  
  // Monthly service health check on 1st at 9 AM
  monthlyHealthCheck: {
    schedule: '0 9 1 * *',
    handler: async () => {
      const healthChecker = new ServiceHealthChecker();
      const report = await healthChecker.generateHealthReport();
      await sendHealthReportToManagers(report);
    }
  },
  
  // Hourly deadline notifications
  hourlyDeadlineCheck: {
    schedule: '0 * * * *',
    handler: async () => {
      const notificationService = new NotificationService();
      await notificationService.checkUpcomingDeadlines();
    }
  }
};
```

## 📊 Performance Specifications

### Database Performance Requirements

```typescript
// Query performance targets
const performanceTargets = {
  // Client service lookup
  getClientServices: {
    maxExecutionTime: '100ms',
    maxMemoryUsage: '50MB',
    expectedRows: '<1000 per client'
  },
  
  // Workflow history retrieval
  getWorkflowHistory: {
    maxExecutionTime: '150ms',
    maxMemoryUsage: '25MB',
    expectedRows: '<500 per service'
  },
  
  // Staff workload calculation
  calculateStaffWorkload: {
    maxExecutionTime: '200ms',
    maxMemoryUsage: '100MB',
    expectedRows: '<10000 active services'
  },
  
  // Trigger processing
  processTriggers: {
    maxExecutionTime: '5s',
    maxMemoryUsage: '200MB',
    expectedRows: '<1000 active triggers'
  }
};
```

### Caching Strategy

```typescript
interface CacheManager {
  // Service configuration caching
  getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig>;
  
  // User workload caching
  getUserWorkload(userId: string): Promise<WorkloadSummary>;
  
  // Client service summary caching
  getClientServiceSummary(clientId: string): Promise<ServiceSummary>;
  
  // Invalidation methods
  invalidateServiceCache(serviceId: string): Promise<void>;
  invalidateUserCache(userId: string): Promise<void>;
  invalidateClientCache(clientId: string): Promise<void>;
}

// Cache configuration
const cacheConfig = {
  serviceConfig: {
    ttl: 3600, // 1 hour
    maxSize: 100
  },
  userWorkload: {
    ttl: 300, // 5 minutes
    maxSize: 1000
  },
  clientServiceSummary: {
    ttl: 600, // 10 minutes
    maxSize: 5000
  }
};
```

## 🔐 Security Specifications

### Role-Based Access Control

```typescript
interface SecurityManager {
  canUserAccessService(userId: string, serviceId: string): Promise<boolean>;
  canUserPerformAction(userId: string, serviceId: string, action: WorkflowAction): Promise<boolean>;
  canUserViewStage(userId: string, stage: number, serviceType: ServiceType): Promise<boolean>;
  auditUserAction(userId: string, action: string, resourceId: string, metadata?: any): Promise<void>;
}

// Permission matrix
const permissionMatrix = {
  PARTNER: {
    services: ['*'], // All services
    stages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All stages
    actions: ['*'] // All actions
  },
  MANAGER: {
    services: ['assigned', 'team'], // Assigned and team services
    stages: [1, 2, 3, 4, 5, 6, 7], // Limited stage access
    actions: ['ADVANCE', 'SEND_BACK', 'ASSIGN', 'NOTE', 'UPLOAD']
  },
  STAFF: {
    services: ['assigned'], // Only assigned services
    stages: [3, 4, 5], // Work stages only
    actions: ['ADVANCE', 'NOTE', 'UPLOAD']
  }
};
```

### Data Validation

```typescript
// Input validation schemas
const serviceValidationSchemas = {
  createService: z.object({
    client_id: z.string().uuid(),
    service_type: z.enum(['ACCOUNTS_LTD', 'ACCOUNTS_NON_LTD', 'VAT']),
    config: z.object({
      vat_frequency: z.enum(['MONTHLY', 'QUARTERLY_1', 'QUARTERLY_2', 'QUARTERLY_3']).optional(),
      accounting_reference_date: z.string().date().optional(),
      deadline: z.string().date().optional()
    }).optional(),
    assigned_staff_id: z.string().uuid().optional()
  }),
  
  advanceWorkflow: z.object({
    notes: z.string().max(1000).optional(),
    files: z.array(z.string()).max(10).optional()
  }),
  
  sendBackWorkflow: z.object({
    target_stage: z.number().min(1).max(10),
    reason: z.string().min(1).max(500),
    notes: z.string().max(1000).optional()
  })
};
```

## 🧪 Testing Specifications

### Unit Test Coverage Requirements

```typescript
// Test coverage targets
const testCoverageTargets = {
  serviceManager: 95,
  workflowEngine: 95,
  automationEngine: 90,
  triggerHandlers: 90,
  validationRules: 100,
  securityManager: 95,
  apiEndpoints: 85
};

// Critical test scenarios
const criticalTestScenarios = [
  'Service creation with valid data',
  'Service creation with invalid data',
  'Workflow advancement with proper permissions',
  'Workflow advancement with insufficient permissions',
  'Parallel service management for single client',
  'Automation trigger execution',
  'Stage validation enforcement',
  'Role-based access control',
  'Data consistency across service operations',
  'Performance under concurrent load'
];
```

### Integration Test Requirements

```typescript
// Integration test scenarios
const integrationTests = [
  {
    name: 'Complete workflow progression',
    description: 'Test full 10-stage workflow from creation to completion',
    steps: [
      'Create client with accounts service',
      'Progress through all 10 stages',
      'Verify stage transitions and validations',
      'Confirm completion and audit trail'
    ]
  },
  {
    name: 'Multi-service client management',
    description: 'Test parallel service management for single client',
    steps: [
      'Create client with multiple services',
      'Progress services independently',
      'Verify service isolation',
      'Test cross-service data consistency'
    ]
  },
  {
    name: 'Automation engine functionality',
    description: 'Test automated workflow creation and triggers',
    steps: [
      'Set up trigger conditions',
      'Execute automation engine',
      'Verify workflow creation',
      'Test notification delivery'
    ]
  }
];
```

## 🚀 Deployment Specifications

### Environment Configuration

```typescript
// Environment-specific configurations
const environmentConfigs = {
  development: {
    database: {
      maxConnections: 10,
      queryTimeout: 30000,
      enableLogging: true
    },
    cache: {
      enabled: false
    },
    automation: {
      enabled: false,
      checkInterval: 3600000 // 1 hour
    }
  },
  
  staging: {
    database: {
      maxConnections: 25,
      queryTimeout: 15000,
      enableLogging: true
    },
    cache: {
      enabled: true,
      provider: 'redis',
      url: process.env.REDIS_URL
    },
    automation: {
      enabled: true,
      checkInterval: 1800000 // 30 minutes
    }
  },
  
  production: {
    database: {
      maxConnections: 50,
      queryTimeout: 10000,
      enableLogging: false
    },
    cache: {
      enabled: true,
      provider: 'redis',
      url: process.env.REDIS_URL
    },
    automation: {
      enabled: true,
      checkInterval: 900000 // 15 minutes
    }
  }
};
```

### Migration Strategy

```typescript
// Database migration plan
const migrationPlan = {
  phase1: {
    description: 'Create core service tables',
    scripts: [
      '001_create_service_enums.sql',
      '002_create_client_services_table.sql',
      '003_create_workflow_history_table.sql',
      '004_create_service_triggers_table.sql',
      '005_add_client_service_indexes.sql'
    ]
  },
  
  phase2: {
    description: 'Add extended client fields',
    scripts: [
      '006_add_vat_fields_to_clients.sql',
      '007_add_business_type_fields.sql',
      '008_add_service_specific_indexes.sql'
    ]
  },
  
  phase3: {
    description: 'Data migration and cleanup',
    scripts: [
      '009_migrate_existing_client_data.sql',
      '010_create_default_service_configs.sql',
      '011_cleanup_deprecated_fields.sql'
    ]
  }
};
```

---

These technical specifications provide a comprehensive blueprint for implementing the multi-service workflow system with proper architecture, performance considerations, security measures, and deployment strategies.
