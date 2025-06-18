# Service Architecture Documentation

## 🏗️ Overview

The Numericalz Service Architecture is designed to support multiple accounting services running in parallel for each client. This document outlines the technical architecture, service types, data models, and integration patterns.

## 📋 Service Types

### 1. Accounts Service

#### Accounts - Ltd Companies (ACCOUNTS_LTD)
**Description**: Statutory accounts preparation for UK limited companies  
**Companies House Integration**: Required  
**Trigger**: Day after accounting reference date (year-end)  
**Workflow**: Standard 10-stage process  

**Required Data**:
```typescript
{
  company_number: string,           // Companies House number
  accounting_reference_date: Date,  // Year-end date
  accounts_due_date: Date,         // Filing deadline
  corporation_tax_due_date: Date,  // CT61 deadline
  dormant_status: boolean,         // Dormant company flag
  small_company_exemption: boolean // Small company filing exemption
}
```

**Automation Logic**:
```typescript
// Trigger condition
if (today > client.accounting_reference_date) {
  createAccountsWorkflow({
    client_id: client.id,
    service_type: "ACCOUNTS_LTD",
    due_date: client.accounts_due_date,
    trigger_date: client.accounting_reference_date + 1
  });
}
```

#### Accounts - Non-Ltd Companies (ACCOUNTS_NON_LTD)
**Description**: Accounts preparation for partnerships, sole traders, LLPs  
**Companies House Integration**: Not required  
**Trigger**: Day after accounting year-end  
**Workflow**: Standard 10-stage process  

**Required Data**:
```typescript
{
  business_type: "PARTNERSHIP" | "SOLE_TRADER" | "LLP",
  accounting_year_end: Date,       // Year-end date
  tax_return_due_date: Date,      // Self-assessment deadline
  partnership_tax_return: boolean, // Partnership return required
  number_of_partners?: number      // For partnerships
}
```

### 2. VAT Service

#### VAT Returns (VAT)
**Description**: VAT return preparation and submission  
**Companies House Integration**: Not required  
**Trigger**: Based on VAT frequency pattern  
**Workflow**: Standard 10-stage process  

**VAT Frequencies**:
```typescript
enum VATFrequency {
  MONTHLY = "MONTHLY",           // Every month
  QUARTERLY_1 = "QUARTERLY_1",   // Jan, Apr, Jul, Oct (1/4/7/10)
  QUARTERLY_2 = "QUARTERLY_2",   // Feb, May, Aug, Nov (2/5/8/11)
  QUARTERLY_3 = "QUARTERLY_3"    // Mar, Jun, Sep, Dec (3/6/9/12)
}
```

**Required Data**:
```typescript
{
  vat_number: string,              // VAT registration number
  vat_frequency: VATFrequency,     // Return frequency
  vat_scheme: "STANDARD" | "FLAT_RATE" | "CASH_ACCOUNTING",
  registration_date: Date,         // VAT registration date
  deregistration_date?: Date,      // If deregistered
  flat_rate_percentage?: number,   // For flat rate scheme
  annual_accounting_scheme: boolean
}
```

**Automation Logic**:
```typescript
// Monthly triggers
if (vat_frequency === "MONTHLY") {
  // Create workflow for each month
  createVATWorkflow({
    due_date: lastDayOfMonth + 7, // 7 days after month end
    period_start: firstDayOfMonth,
    period_end: lastDayOfMonth
  });
}

// Quarterly triggers
if (vat_frequency === "QUARTERLY_1") {
  const quarters = [1, 4, 7, 10]; // Jan, Apr, Jul, Oct
  quarters.forEach(month => {
    createVATWorkflow({
      due_date: endOfQuarter + 30, // 1 month + 7 days after quarter
      period_start: startOfQuarter,
      period_end: endOfQuarter
    });
  });
}
```

### 3. PAYE/Pension/CIS Service (Future)

#### PAYE Returns (PAYE)
**Description**: PAYE return preparation and RTI submissions  
**Implementation**: Future phase  
**Trigger**: Monthly/quarterly based on employee count  

#### Pension Auto-Enrolment (PENSION)
**Description**: Pension scheme compliance and submissions  
**Implementation**: Future phase  
**Trigger**: Based on staging dates and re-enrolment cycles  

#### CIS Returns (CIS)
**Description**: Construction Industry Scheme returns  
**Implementation**: Future phase  
**Trigger**: Monthly CIS return submissions  

## 🗄️ Database Architecture

### Core Service Tables

#### client_services (Junction Table)
```sql
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type service_type_enum NOT NULL,
  status service_status_enum DEFAULT 'ACTIVE',
  current_stage INTEGER DEFAULT 1 CHECK (current_stage >= 1 AND current_stage <= 10),
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workflow_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(client_id, service_type),
  
  -- Indexes
  INDEX idx_client_services_client_id (client_id),
  INDEX idx_client_services_service_type (service_type),
  INDEX idx_client_services_assigned_staff (assigned_staff_id),
  INDEX idx_client_services_status (status),
  INDEX idx_client_services_stage (current_stage)
);
```

#### workflow_history (Audit Trail)
```sql
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  from_stage INTEGER,
  to_stage INTEGER,
  action_by_user_id UUID NOT NULL REFERENCES users(id),
  action_type workflow_action_enum NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- Indexes
  INDEX idx_workflow_history_client_service (client_service_id),
  INDEX idx_workflow_history_user (action_by_user_id),
  INDEX idx_workflow_history_created_at (created_at),
  INDEX idx_workflow_history_action_type (action_type)
);
```

#### service_configs (Configuration Management)
```sql
CREATE TABLE service_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type_enum NOT NULL UNIQUE,
  config_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_service_configs_service_type (service_type),
  INDEX idx_service_configs_active (is_active)
);
```

### Extended Client Fields

#### VAT-Specific Fields
```sql
ALTER TABLE clients ADD COLUMN vat_number VARCHAR(15);
ALTER TABLE clients ADD COLUMN vat_frequency vat_frequency_enum;
ALTER TABLE clients ADD COLUMN vat_scheme vat_scheme_enum;
ALTER TABLE clients ADD COLUMN vat_registration_date DATE;
ALTER TABLE clients ADD COLUMN vat_deregistration_date DATE;
ALTER TABLE clients ADD COLUMN flat_rate_percentage DECIMAL(5,2);
ALTER TABLE clients ADD COLUMN annual_accounting_scheme BOOLEAN DEFAULT false;
```

#### Enhanced Accounts Fields
```sql
ALTER TABLE clients ADD COLUMN dormant_status BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN small_company_exemption BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN business_type business_type_enum;
ALTER TABLE clients ADD COLUMN number_of_partners INTEGER;
ALTER TABLE clients ADD COLUMN partnership_tax_return BOOLEAN DEFAULT false;
```

### Enums and Types

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

-- VAT frequency
CREATE TYPE vat_frequency_enum AS ENUM (
  'MONTHLY',
  'QUARTERLY_1',
  'QUARTERLY_2', 
  'QUARTERLY_3'
);

-- VAT scheme
CREATE TYPE vat_scheme_enum AS ENUM (
  'STANDARD',
  'FLAT_RATE',
  'CASH_ACCOUNTING'
);

-- Business type
CREATE TYPE business_type_enum AS ENUM (
  'LIMITED_COMPANY',
  'PARTNERSHIP',
  'SOLE_TRADER',
  'LLP'
);

-- Workflow actions
CREATE TYPE workflow_action_enum AS ENUM (
  'ADVANCE',
  'SEND_BACK',
  'ASSIGN',
  'NOTE',
  'UPLOAD',
  'DEADLINE_CHANGE',
  'COMPLETE'
);
```

## 🔧 Service Management Architecture

### Service Factory Pattern

```typescript
interface ServiceManager {
  createService(clientId: string, serviceType: ServiceType): Promise<ClientService>;
  getClientServices(clientId: string): Promise<ClientService[]>;
  updateServiceStage(serviceId: string, newStage: number): Promise<void>;
  assignStaffToService(serviceId: string, staffId: string): Promise<void>;
  getServiceWorkflow(serviceId: string): Promise<WorkflowHistory[]>;
}

class ServiceFactory {
  static createService(serviceType: ServiceType): ServiceHandler {
    switch (serviceType) {
      case 'ACCOUNTS_LTD':
        return new AccountsLtdService();
      case 'ACCOUNTS_NON_LTD':
        return new AccountsNonLtdService();
      case 'VAT':
        return new VATService();
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }
  }
}
```

### Service Handler Interface

```typescript
interface ServiceHandler {
  validateServiceData(data: any): ValidationResult;
  calculateDeadlines(clientData: any): ServiceDeadlines;
  createAutomationTriggers(clientId: string): Promise<void>;
  getServiceSpecificFields(): FormField[];
  generateWorkflowData(clientData: any): WorkflowData;
}

class AccountsLtdService implements ServiceHandler {
  validateServiceData(data: AccountsLtdData): ValidationResult {
    // Validate Companies House integration data
    // Validate accounting reference date
    // Validate corporation tax requirements
  }
  
  calculateDeadlines(clientData: any): ServiceDeadlines {
    return {
      accounts_due: clientData.accounting_reference_date + months(9),
      ct_due: clientData.accounting_reference_date + months(9) + days(1),
      confirmation_statement: clientData.incorporation_date + years(1)
    };
  }
  
  createAutomationTriggers(clientId: string): Promise<void> {
    // Create trigger for day after year-end
  }
}

class VATService implements ServiceHandler {
  validateServiceData(data: VATData): ValidationResult {
    // Validate VAT number format
    // Validate frequency selection
    // Validate scheme compatibility
  }
  
  calculateDeadlines(clientData: any): ServiceDeadlines {
    const frequency = clientData.vat_frequency;
    return this.calculateVATDeadlines(frequency);
  }
  
  private calculateVATDeadlines(frequency: VATFrequency): ServiceDeadlines {
    // Calculate based on frequency pattern
  }
}
```

## 🔄 Parallel Service Execution

### Multi-Service Client Example

```typescript
// Client with multiple active services
const clientServices = {
  client_id: "abc-ltd-001",
  services: [
    {
      id: "service-001",
      service_type: "ACCOUNTS_LTD",
      current_stage: 5,
      assigned_staff_id: "john-doe",
      workflow_data: {
        year_end: "2024-03-31",
        accounts_due: "2024-12-31",
        ct_due: "2025-01-01"
      },
      status: "ACTIVE"
    },
    {
      id: "service-002", 
      service_type: "VAT",
      current_stage: 3,
      assigned_staff_id: "jane-smith",
      workflow_data: {
        vat_frequency: "QUARTERLY_1",
        period_end: "2024-01-31",
        due_date: "2024-03-07"
      },
      status: "ACTIVE"
    }
  ]
};
```

### Service Independence

1. **Separate Workflows**: Each service maintains its own 10-stage workflow
2. **Independent Assignment**: Different staff can handle different services
3. **Parallel Progression**: Services advance independently
4. **Separate Deadlines**: Each service has its own due dates
5. **Individual Automation**: Services trigger independently

### Cross-Service Coordination

```typescript
interface ServiceCoordinator {
  checkServiceDependencies(clientId: string): ServiceDependency[];
  validateServiceCombination(services: ServiceType[]): ValidationResult;
  getConflictingDeadlines(clientId: string): DeadlineConflict[];
  optimizeWorkload(staffId: string): WorkloadOptimization;
}

// Example service dependencies
const serviceDependencies = {
  ACCOUNTS_LTD: {
    requires: [], // No dependencies
    conflicts_with: ['ACCOUNTS_NON_LTD'], // Can't have both
    complements: ['VAT', 'PAYE'] // Works well with
  },
  VAT: {
    requires: [], // No dependencies
    conflicts_with: [], // No conflicts
    complements: ['ACCOUNTS_LTD', 'ACCOUNTS_NON_LTD']
  }
};
```

## 🤖 Automation Engine

### Trigger System

```typescript
class AutomationEngine {
  async checkTriggers(): Promise<void> {
    const services = await this.getActiveServices();
    
    for (const service of services) {
      const handler = ServiceFactory.createService(service.service_type);
      const shouldTrigger = await handler.checkTriggerCondition(service);
      
      if (shouldTrigger) {
        await this.createWorkflow(service);
      }
    }
  }
  
  private async createWorkflow(service: ClientService): Promise<void> {
    // Create new workflow instance
    // Set initial stage (1)
    // Assign default staff if configured
    // Send notifications
    // Log creation event
  }
}
```

### Scheduled Jobs

```typescript
// Daily automation check
cron.schedule('0 9 * * *', async () => {
  const automationEngine = new AutomationEngine();
  await automationEngine.checkTriggers();
});

// Weekly workload balancing
cron.schedule('0 9 * * 1', async () => {
  const workloadBalancer = new WorkloadBalancer();
  await workloadBalancer.rebalanceTeamWorkload();
});

// Monthly service health check
cron.schedule('0 9 1 * *', async () => {
  const healthChecker = new ServiceHealthChecker();
  await healthChecker.checkServiceHealth();
});
```

## 📊 Performance Optimization

### Database Optimization

#### Indexing Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_client_services_lookup ON client_services(client_id, service_type, status);
CREATE INDEX idx_workflow_active ON client_services(status, current_stage) WHERE status = 'ACTIVE';
CREATE INDEX idx_staff_workload ON client_services(assigned_staff_id, status) WHERE status = 'ACTIVE';

-- Partial indexes for specific queries
CREATE INDEX idx_overdue_services ON client_services(created_at) 
  WHERE status = 'ACTIVE' AND current_stage < 10;
```

#### Query Optimization
```typescript
// Efficient service lookup with relationships
const clientWithServices = await prisma.client.findUnique({
  where: { id: clientId },
  include: {
    services: {
      where: { status: 'ACTIVE' },
      include: {
        assignedStaff: {
          select: { id: true, name: true, email: true }
        },
        workflowHistory: {
          orderBy: { created_at: 'desc' },
          take: 5
        }
      }
    }
  }
});
```

### Caching Strategy

```typescript
// Service configuration caching
const serviceConfigCache = new Map<ServiceType, ServiceConfig>();

class ServiceConfigManager {
  async getServiceConfig(serviceType: ServiceType): Promise<ServiceConfig> {
    if (serviceConfigCache.has(serviceType)) {
      return serviceConfigCache.get(serviceType)!;
    }
    
    const config = await prisma.serviceConfig.findUnique({
      where: { service_type: serviceType }
    });
    
    serviceConfigCache.set(serviceType, config);
    return config;
  }
}
```

## 🔌 Integration Points

### HelloSign Integration

```typescript
interface HelloSignService {
  createSignatureRequest(serviceId: string, templateId: string): Promise<SignatureRequest>;
  getSignatureStatus(requestId: string): Promise<SignatureStatus>;
  downloadSignedDocument(requestId: string): Promise<Buffer>;
  cancelSignatureRequest(requestId: string): Promise<void>;
}

// Webhook handler for HelloSign events
app.post('/api/webhooks/hellosign', async (req, res) => {
  const event = req.body;
  
  if (event.event_type === 'signature_request_signed') {
    const serviceId = event.signature_request.metadata.service_id;
    await workflowManager.advanceStage(serviceId, 9); // Stage 9: Approved by client
  }
});
```

### Companies House Integration

```typescript
// Enhanced Companies House service for multi-service support
class CompaniesHouseService {
  async getCompanyDetails(companyNumber: string): Promise<CompanyDetails> {
    // Fetch company data for accounts service
  }
  
  async getFilingHistory(companyNumber: string): Promise<FilingHistory[]> {
    // Get filing history for deadline calculation
  }
  
  async getOfficers(companyNumber: string): Promise<Officer[]> {
    // Get current officers for accounts preparation
  }
}
```

## 🧪 Testing Strategy

### Service Testing

```typescript
describe('Service Architecture', () => {
  describe('ServiceFactory', () => {
    it('should create correct service handler for each type', () => {
      const accountsService = ServiceFactory.createService('ACCOUNTS_LTD');
      expect(accountsService).toBeInstanceOf(AccountsLtdService);
    });
  });
  
  describe('Parallel Services', () => {
    it('should allow multiple services for same client', async () => {
      const client = await createTestClient();
      
      await serviceManager.createService(client.id, 'ACCOUNTS_LTD');
      await serviceManager.createService(client.id, 'VAT');
      
      const services = await serviceManager.getClientServices(client.id);
      expect(services).toHaveLength(2);
    });
  });
  
  describe('Automation Engine', () => {
    it('should trigger workflows based on dates', async () => {
      const client = await createTestClientWithYearEnd(yesterday);
      
      await automationEngine.checkTriggers();
      
      const workflows = await getActiveWorkflows(client.id);
      expect(workflows).toHaveLength(1);
      expect(workflows[0].service_type).toBe('ACCOUNTS_LTD');
    });
  });
});
```

## 🚀 Future Enhancements

### Advanced Service Features

1. **Service Templates**: Pre-configured service setups for common client types
2. **Service Dependencies**: Automatic creation of dependent services
3. **Service Bundles**: Package deals for common service combinations
4. **Custom Service Types**: User-defined service types and workflows
5. **Service Analytics**: Performance metrics and optimization insights

### Integration Expansions

1. **Accounting Software**: Direct integration with Xero, QuickBooks, Sage
2. **Document Management**: Integration with cloud storage providers
3. **Communication Tools**: Slack/Teams integration for notifications
4. **CRM Systems**: Client relationship management integration
5. **Banking APIs**: Open Banking integration for financial data

---

This service architecture provides a robust, scalable foundation for managing multiple accounting services while maintaining flexibility for future enhancements and integrations. 