# Numericalz Database Schema Documentation

## 🎯 Overview

This document provides a comprehensive overview of the Numericalz database schema, including table structures, relationships, indexes, and data integrity constraints. The database is designed to support a UK-based accounting firm's internal management system with multi-user access, client management, task tracking, and communication features.

## 🗄️ Database Technology

- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Connection Pooling**: Built-in Prisma connection pooling
- **Migrations**: Prisma Migrate
- **Seeding**: Prisma seed scripts

## 📊 Complete Prisma Schema

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User management
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      UserRole @default(STAFF)
  firstName String
  lastName  String
  isActive  Boolean  @default(true)
  lastLoginAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  // Relations
  assignedClients     Client[]         @relation("AssignedToUser")
  clientsCreated      Client[]         @relation("CreatedByUser")
  tasksAssigned       Task[]           @relation("AssignedToUser")
  tasksCreated        Task[]           @relation("CreatedByUser")
  communications      Communication[]
  emailTemplatesCreated EmailTemplate[] @relation("CreatedByUser")
  activityLogs        ActivityLog[]
  sessions            Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// Client management
model Client {
  id                 String       @id @default(cuid())
  companyNumber      String?      @unique
  companyName        String
  companyType        CompanyType
  companyStatus      String?
  incorporationDate  DateTime?
  registeredAddress  Json?
  sicCodes           String[]
  
  // Contact information
  contactPerson      String?
  contactEmail       String?
  contactPhone       String?
  
  // Assignment tracking
  assignedTo         String?
  assignedBy         String?
  assignedAt         DateTime?
  
  // Accounting details
  yearEnd            DateTime?
  nextAccountsDue    DateTime?
  nextConfirmationDue DateTime?
  accountingPeriod   String?
  
  // Status and notes
  status             ClientStatus @default(ACTIVE)
  notes              String?
  
  // Timestamps
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  deletedAt          DateTime?

  // Relations
  assignedToUser     User?           @relation("AssignedToUser", fields: [assignedTo], references: [id])
  assignedByUser     User?           @relation("CreatedByUser", fields: [assignedBy], references: [id])
  tasks              Task[]
  communications     Communication[]
  documents          Document[]
  activityLogs       ActivityLog[]

  // Full-text search
  searchVector       String?

  @@map("clients")
  @@index([companyNumber])
  @@index([companyName])
  @@index([assignedTo])
  @@index([nextAccountsDue])
  @@index([status])
}

// Task and deadline management
model Task {
  id               String       @id @default(cuid())
  clientId         String
  assignedTo       String
  createdBy        String
  taskType         TaskType
  title            String
  description      String?
  dueDate          DateTime
  status           TaskStatus   @default(PENDING)
  priority         TaskPriority @default(MEDIUM)
  estimatedHours   Int?
  actualHours      Int?
  notes            String?
  completedAt      DateTime?
  completionNotes  String?
  
  // Timestamps
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  deletedAt        DateTime?

  // Relations
  client           Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  assignedToUser   User         @relation("AssignedToUser", fields: [assignedTo], references: [id])
  createdByUser    User         @relation("CreatedByUser", fields: [createdBy], references: [id])
  activityLogs     ActivityLog[]

  @@map("tasks")
  @@index([clientId])
  @@index([assignedTo])
  @@index([dueDate])
  @@index([status])
  @@index([taskType])
}

// Communication tracking
model Communication {
  id           String            @id @default(cuid())
  clientId     String
  userId       String
  type         CommunicationType
  subject      String?
  content      String
  templateUsed String?
  recipientEmail String?
  status       CommunicationStatus @default(PENDING)
  sentAt       DateTime?
  deliveredAt  DateTime?
  openedAt     DateTime?
  
  // Timestamps
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  // Relations
  client       Client            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user         User              @relation(fields: [userId], references: [id])
  activityLogs ActivityLog[]

  @@map("communications")
  @@index([clientId])
  @@index([userId])
  @@index([type])
  @@index([sentAt])
}

// Email template management
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String
  subject     String
  content     String
  variables   String[] // JSON array of variable names
  isActive    Boolean  @default(true)
  createdBy   String
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  createdByUser User   @relation("CreatedByUser", fields: [createdBy], references: [id])

  @@map("email_templates")
  @@index([isActive])
  @@index([createdBy])
}

// Document management
model Document {
  id           String   @id @default(cuid())
  clientId     String
  fileName     String
  fileSize     Int
  fileType     String
  filePath     String
  uploadedBy   String
  category     String?
  description  String?
  
  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  client       Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("documents")
  @@index([clientId])
  @@index([category])
}

// Activity logging for audit trail
model ActivityLog {
  id           String    @id @default(cuid())
  userId       String?
  clientId     String?
  taskId       String?
  communicationId String?
  action       String
  details      Json?
  ipAddress    String?
  userAgent    String?
  
  // Timestamps
  createdAt    DateTime  @default(now())

  // Relations
  user         User?          @relation(fields: [userId], references: [id])
  client       Client?        @relation(fields: [clientId], references: [id])
  task         Task?          @relation(fields: [taskId], references: [id])
  communication Communication? @relation(fields: [communicationId], references: [id])

  @@map("activity_logs")
  @@index([userId])
  @@index([clientId])
  @@index([action])
  @@index([createdAt])
}

// Notification system
model Notification {
  id         String             @id @default(cuid())
  userId     String
  type       NotificationType
  title      String
  message    String
  isRead     Boolean            @default(false)
  actionUrl  String?
  data       Json?
  
  // Timestamps
  createdAt  DateTime           @default(now())
  readAt     DateTime?

  @@map("notifications")
  @@index([userId])
  @@index([isRead])
  @@index([type])
  @@index([createdAt])
}

// Enums
enum UserRole {
  MANAGER
  STAFF
}

enum CompanyType {
  LTD
  NON_LTD
  DIRECTOR
  SUBCONTRACTOR
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  PENDING
  ARCHIVED
}

enum TaskType {
  ANNUAL_ACCOUNTS
  VAT_RETURN
  CONFIRMATION_STATEMENT
  TAX_RETURN
  PAYROLL
  BOOKKEEPING
  CONSULTATION
  OTHER
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum CommunicationType {
  EMAIL
  PHONE
  MEETING
  NOTE
  SMS
}

enum CommunicationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  BOUNCED
}

enum NotificationType {
  DEADLINE_REMINDER
  TASK_ASSIGNMENT
  TASK_COMPLETION
  CLIENT_UPDATE
  SYSTEM_ALERT
  EMAIL_DELIVERY
}
```

## 📝 Table Descriptions

### Users Table
Stores user information for the internal team including managers and staff members.

**Key Features:**
- Role-based access control (MANAGER, STAFF)
- Soft delete capability with `deletedAt`
- Login tracking with `lastLoginAt`
- Secure password storage (hashed with bcrypt)

**Business Rules:**
- Email must be unique across all users
- Managers can create/modify other users
- Staff can only access assigned clients
- Inactive users cannot log in

### Clients Table
Central table storing all client company information and accounting details.

**Key Features:**
- Integration with Companies House API data
- Flexible address storage as JSON
- Assignment tracking with user relationships
- Full-text search capabilities
- Multiple SIC codes support

**Business Rules:**
- Company number must be unique if provided
- Client assignment creates activity log entry
- Deadline dates auto-calculated based on company data
- Status changes trigger notifications

### Tasks Table
Manages all accounting tasks and deadlines with priority and status tracking.

**Key Features:**
- Multiple task types for different accounting activities
- Priority levels for workload management
- Time tracking with estimated vs actual hours
- Completion workflow with notes
- Automatic overdue detection

**Business Rules:**
- Tasks must have valid due dates
- Only assigned user or managers can update tasks
- Completed tasks cannot be modified
- Overdue tasks trigger automatic notifications

### Communications Table
Tracks all client communications including emails, calls, and meetings.

**Key Features:**
- Multiple communication types
- Email delivery tracking
- Template usage tracking
- Status monitoring for email delivery

**Business Rules:**
- All client communications must be logged
- Email templates create standardized communications
- Failed communications trigger retry mechanisms
- Communication history is immutable

### Email Templates Table
Manages reusable email templates with variable substitution.

**Key Features:**
- Variable placeholder system ({{clientName}}, {{dueDate}}, etc.)
- Template versioning through updated timestamps
- Manager-only creation and editing
- Active/inactive status for template management

**Business Rules:**
- Only managers can create/edit templates
- Variables must be defined in template metadata
- Inactive templates cannot be used for new communications
- Template usage is tracked in communications

### Documents Table
Handles file storage and categorization for client documents.

**Key Features:**
- File metadata storage
- Category-based organization
- Upload tracking with user information
- Size and type validation

**Business Rules:**
- Files stored outside database (cloud storage)
- Document access restricted to assigned users
- File size limits enforced at application level
- Document deletion requires manager approval

### Activity Logs Table
Comprehensive audit trail for all system activities.

**Key Features:**
- Action tracking across all major operations
- IP address and user agent logging
- Flexible JSON details storage
- Immutable log entries

**Business Rules:**
- All client/task modifications logged
- User login/logout events tracked
- Logs cannot be modified or deleted
- GDPR compliance for data retention

### Notifications Table
Real-time notification system for users.

**Key Features:**
- Multiple notification types
- Read/unread status tracking
- Optional action URLs for quick access
- Flexible data storage for notification context

**Business Rules:**
- Notifications expire after 30 days
- Critical notifications cannot be deleted until read
- Users can configure notification preferences
- System notifications generated automatically

## 🔗 Relationships and Constraints

### Primary Relationships

```
Users (1) ←→ (Many) Clients [assignedTo]
Users (1) ←→ (Many) Tasks [assignedTo]
Users (1) ←→ (Many) Communications [userId]
Users (1) ←→ (Many) EmailTemplates [createdBy]

Clients (1) ←→ (Many) Tasks [clientId]
Clients (1) ←→ (Many) Communications [clientId]
Clients (1) ←→ (Many) Documents [clientId]

Tasks (1) ←→ (Many) ActivityLogs [taskId]
Communications (1) ←→ (Many) ActivityLogs [communicationId]
```

### Foreign Key Constraints

- All foreign keys use CASCADE DELETE where appropriate
- Soft deletes prevent data loss for audit purposes
- Orphaned records cleaned up by scheduled jobs

## 📈 Indexes and Performance

### Primary Indexes

```sql
-- Performance critical indexes
CREATE INDEX idx_clients_company_number ON clients(company_number);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX idx_clients_next_accounts_due ON clients(next_accounts_due);
CREATE INDEX idx_clients_status ON clients(status);

CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE INDEX idx_communications_client_id ON communications(client_id);
CREATE INDEX idx_communications_sent_at ON communications(sent_at);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

### Full-Text Search

```sql
-- Full-text search on clients
ALTER TABLE clients ADD COLUMN search_vector tsvector;
CREATE INDEX idx_clients_search ON clients USING GIN(search_vector);

-- Update trigger for search vector
CREATE OR REPLACE FUNCTION update_client_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.company_name, '') || ' ' ||
    COALESCE(NEW.company_number, '') || ' ' ||
    COALESCE(NEW.contact_person, '') || ' ' ||
    COALESCE(NEW.contact_email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_search_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_client_search_vector();
```

## 🛡️ Security and Data Protection

### Data Encryption

- Passwords hashed using bcrypt with salt rounds
- Sensitive data encrypted at rest (database level)
- API communications over HTTPS only
- Environment variables for sensitive configuration

### Access Control

- Row-level security for multi-tenant data isolation
- User role-based access control in application layer
- Database user permissions minimized to required operations
- Regular security audits and updates

### GDPR Compliance

```sql
-- Data retention policies
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs 
  WHERE created_at < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Scheduled cleanup job
SELECT cron.schedule('cleanup-logs', '0 2 * * 0', 'SELECT cleanup_old_activity_logs();');
```

## 🔄 Migration Strategy

### Initial Setup

```bash
# Initialize Prisma
npx prisma init

# Generate initial migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database
npx prisma db seed
```

### Migration Best Practices

- Always backup production data before migrations
- Test migrations on staging environment first
- Use transactions for complex schema changes
- Maintain migration rollback scripts
- Document breaking changes and required data migrations

## 📊 Database Seeding

### Development Seed Data

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole, CompanyType, TaskType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create manager user
  const manager = await prisma.user.create({
    data: {
      email: 'manager@numericalz.com',
      password: await bcrypt.hash('Manager123!', 10),
      role: UserRole.MANAGER,
      firstName: 'John',
      lastName: 'Manager',
    },
  })

  // Create staff user
  const staff = await prisma.user.create({
    data: {
      email: 'staff@numericalz.com',
      password: await bcrypt.hash('Staff123!', 10),
      role: UserRole.STAFF,
      firstName: 'Jane',
      lastName: 'Accountant',
    },
  })

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      companyNumber: '12345678',
      companyName: 'Example Ltd',
      companyType: CompanyType.LTD,
      companyStatus: 'active',
      contactPerson: 'John Director',
      contactEmail: 'john@example.com',
      assignedTo: staff.id,
      assignedBy: manager.id,
      assignedAt: new Date(),
      yearEnd: new Date('2024-03-31'),
      nextAccountsDue: new Date('2024-12-31'),
    },
  })

  // Create sample tasks
  await prisma.task.create({
    data: {
      clientId: client1.id,
      assignedTo: staff.id,
      createdBy: manager.id,
      taskType: TaskType.ANNUAL_ACCOUNTS,
      title: 'Prepare Annual Accounts 2024',
      description: 'Complete annual accounts for year ending 31 March 2024',
      dueDate: new Date('2024-12-31'),
      estimatedHours: 8,
    },
  })

  // Create email templates
  await prisma.emailTemplate.create({
    data: {
      name: 'Deadline Reminder',
      subject: 'Account Deadline Reminder - {{clientName}}',
      content: `Dear {{contactPerson}},

This is a reminder that the accounts for {{clientName}} are due on {{dueDate}}.

Please contact us if you need any assistance.

Best regards,
Numericalz Team`,
      variables: ['clientName', 'contactPerson', 'dueDate'],
      createdBy: manager.id,
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## 📈 Performance Monitoring

### Database Metrics

- Query execution time monitoring
- Connection pool utilization
- Index usage statistics
- Table size and growth tracking
- Slow query identification

### Optimization Strategies

- Regular VACUUM and ANALYZE operations
- Query plan analysis for performance bottlenecks
- Index optimization based on usage patterns
- Connection pooling configuration
- Database statistics collection

---

This database schema provides a robust foundation for the Numericalz Internal Management System, supporting all core business requirements while maintaining data integrity, security, and performance. 