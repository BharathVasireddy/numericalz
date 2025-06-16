# Numericalz API Documentation

## 🎯 Overview

The Numericalz API provides a comprehensive set of endpoints for managing accounting firm operations, including user authentication, client management, task tracking, and integration with the Companies House API.

**Base URL**: `https://numericalz-internal.vercel.app/api`  
**Version**: v1.0  
**Authentication**: JWT Bearer Token

## 🔐 Authentication

### Authentication Flow

The API uses JWT-based authentication with NextAuth.js. All protected endpoints require a valid JWT token in the Authorization header.

#### Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@numericalz.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@numericalz.com",
      "role": "MANAGER",
      "firstName": "John",
      "lastName": "Smith"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### Register New User (Manager Only)
```http
POST /api/auth/register
Content-Type: application/json
Authorization: Bearer {token}

{
  "email": "newuser@numericalz.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "STAFF"
}
```

#### Logout
```http
POST /api/auth/signout
Authorization: Bearer {token}
```

## 👥 User Management

### Get Current User
```http
GET /api/users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "user@numericalz.com",
    "role": "MANAGER",
    "firstName": "John",
    "lastName": "Smith",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get All Users (Manager Only)
```http
GET /api/users
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (MANAGER, STAFF)
- `active` (optional): Filter by active status (true, false)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-here",
        "email": "user@numericalz.com",
        "role": "STAFF",
        "firstName": "John",
        "lastName": "Smith",
        "isActive": true,
        "clientCount": 15,
        "pendingTasks": 8
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

### Update User Profile
```http
PATCH /api/users/me
Content-Type: application/json
Authorization: Bearer {token}

{
  "firstName": "John",
  "lastName": "Smith Updated"
}
```

### Deactivate User (Manager Only)
```http
PATCH /api/users/{userId}/deactivate
Authorization: Bearer {token}
```

## 🏢 Client Management

### Get All Clients
```http
GET /api/clients
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by company name or number
- `type` (optional): Filter by company type (LTD, NON_LTD, DIRECTOR, SUBCONTRACTOR)
- `assignedTo` (optional): Filter by assigned user ID
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field (companyName, createdAt, nextAccountsDue)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid-here",
        "companyNumber": "12345678",
        "companyName": "Example Ltd",
        "companyType": "LTD",
        "companyStatus": "active",
        "incorporationDate": "2020-01-15",
        "registeredAddress": {
          "line1": "123 Business Street",
          "city": "London",
          "postcode": "SW1A 1AA",
          "country": "United Kingdom"
        },
        "sicCodes": ["62020", "62090"],
        "contactPerson": "John Director",
        "contactEmail": "john@example.com",
        "contactPhone": "+44 20 1234 5678",
        "assignedTo": {
          "id": "uuid-here",
          "firstName": "Jane",
          "lastName": "Accountant"
        },
        "assignedBy": {
          "id": "uuid-here",
          "firstName": "Manager",
          "lastName": "Smith"
        },
        "assignedAt": "2024-01-01T00:00:00Z",
        "yearEnd": "2024-03-31",
        "nextAccountsDue": "2024-12-31",
        "nextConfirmationDue": "2024-01-15",
        "accountingPeriod": "12 months",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-10T12:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

### Get Single Client
```http
GET /api/clients/{clientId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "companyNumber": "12345678",
    "companyName": "Example Ltd",
    // ... full client details
    "recentTasks": [
      {
        "id": "task-uuid",
        "taskType": "ANNUAL_ACCOUNTS",
        "dueDate": "2024-12-31",
        "status": "PENDING",
        "priority": "HIGH"
      }
    ],
    "communicationHistory": [
      {
        "id": "comm-uuid",
        "type": "EMAIL",
        "subject": "Account Reminder",
        "sentAt": "2024-01-10T10:00:00Z",
        "sentBy": "Jane Accountant"
      }
    ]
  }
}
```

### Create New Client
```http
POST /api/clients
Content-Type: application/json
Authorization: Bearer {token}

{
  "companyNumber": "12345678", // Optional for non-Ltd companies
  "companyName": "New Company Ltd",
  "companyType": "LTD",
  "contactPerson": "John Director",
  "contactEmail": "john@newcompany.com",
  "contactPhone": "+44 20 1234 5678",
  "assignedTo": "staff-user-uuid",
  "yearEnd": "2024-03-31",
  "accountingPeriod": "12 months",
  // Additional fields populated from Companies House if companyNumber provided
  "additionalNotes": "New client from referral"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-client-uuid",
    "companyNumber": "12345678",
    // ... full client details
  },
  "message": "Client created successfully"
}
```

### Update Client
```http
PATCH /api/clients/{clientId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "contactEmail": "newemail@company.com",
  "contactPhone": "+44 20 9876 5432",
  "assignedTo": "different-staff-uuid"
}
```

### Delete Client (Manager Only)
```http
DELETE /api/clients/{clientId}
Authorization: Bearer {token}
```

## 📝 Task Management

### Get Tasks
```http
GET /api/tasks
Authorization: Bearer {token}
```

**Query Parameters:**
- `clientId` (optional): Filter by client
- `assignedTo` (optional): Filter by assigned user
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, OVERDUE)
- `taskType` (optional): Filter by type (ANNUAL_ACCOUNTS, VAT_RETURN, CONFIRMATION, TAX_RETURN)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `dueBefore` (optional): Filter by due date (ISO date)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task-uuid",
        "client": {
          "id": "client-uuid",
          "companyName": "Example Ltd",
          "companyNumber": "12345678"
        },
        "assignedTo": {
          "id": "user-uuid",
          "firstName": "Jane",
          "lastName": "Accountant"
        },
        "taskType": "ANNUAL_ACCOUNTS",
        "dueDate": "2024-12-31",
        "status": "PENDING",
        "priority": "HIGH",
        "notes": "Year-end accounts for 2024",
        "createdAt": "2024-01-01T00:00:00Z",
        "completedAt": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 45,
      "itemsPerPage": 20
    }
  }
}
```

### Create Task
```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer {token}

{
  "clientId": "client-uuid",
  "assignedTo": "user-uuid",
  "taskType": "ANNUAL_ACCOUNTS",
  "dueDate": "2024-12-31",
  "priority": "HIGH",
  "notes": "Year-end accounts preparation"
}
```

### Update Task Status
```http
PATCH /api/tasks/{taskId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "IN_PROGRESS",
  "notes": "Started working on accounts preparation"
}
```

### Complete Task
```http
POST /api/tasks/{taskId}/complete
Content-Type: application/json
Authorization: Bearer {token}

{
  "completionNotes": "Accounts completed and filed with Companies House"
}
```

## 📧 Communication & Email

### Get Communications
```http
GET /api/communications
Authorization: Bearer {token}
```

**Query Parameters:**
- `clientId` (optional): Filter by client
- `type` (optional): Filter by type (EMAIL, NOTE, CALL, MEETING)
- `userId` (optional): Filter by user
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "communications": [
      {
        "id": "comm-uuid",
        "client": {
          "id": "client-uuid",
          "companyName": "Example Ltd"
        },
        "user": {
          "id": "user-uuid",
          "firstName": "Jane",
          "lastName": "Accountant"
        },
        "type": "EMAIL",
        "subject": "Account Deadline Reminder",
        "content": "Dear Client, your accounts are due...",
        "templateUsed": "deadline-reminder",
        "sentAt": "2024-01-10T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 30,
      "itemsPerPage": 20
    }
  }
}
```

### Send Email
```http
POST /api/communications/send-email
Content-Type: application/json
Authorization: Bearer {token}

{
  "clientId": "client-uuid",
  "templateId": "template-uuid", // Optional
  "subject": "Account Reminder",
  "content": "Dear Client, your accounts are due on...",
  "variables": { // For template usage
    "clientName": "Example Ltd",
    "dueDate": "2024-12-31"
  }
}
```

### Get Email Templates
```http
GET /api/email-templates
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template-uuid",
        "name": "Deadline Reminder",
        "subject": "Account Deadline - {{clientName}}",
        "content": "Dear {{contactPerson}}, your accounts for {{clientName}} are due on {{dueDate}}...",
        "variables": ["clientName", "contactPerson", "dueDate"],
        "isActive": true,
        "createdBy": {
          "firstName": "Manager",
          "lastName": "Smith"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Create Email Template (Manager Only)
```http
POST /api/email-templates
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Welcome Email",
  "subject": "Welcome to Numericalz - {{clientName}}",
  "content": "Dear {{contactPerson}}, welcome to our services...",
  "variables": ["clientName", "contactPerson"]
}
```

## 🏢 Companies House Integration

### Search Companies
```http
GET /api/companies-house/search
Authorization: Bearer {token}
```

**Query Parameters:**
- `q`: Search query (company name or number)
- `items_per_page` (optional): Results per page (default: 20, max: 100)
- `start_index` (optional): Starting index (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "company_number": "12345678",
        "title": "EXAMPLE LIMITED",
        "company_status": "active",
        "company_type": "ltd",
        "date_of_creation": "2020-01-15",
        "address": {
          "locality": "London",
          "postal_code": "SW1A 1AA",
          "address_line_1": "123 Business Street"
        }
      }
    ],
    "items_per_page": 20,
    "start_index": 0,
    "total_results": 1
  }
}
```

### Get Company Details
```http
GET /api/companies-house/company/{companyNumber}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "company_number": "12345678",
    "company_name": "EXAMPLE LIMITED",
    "company_status": "active",
    "company_status_detail": "Active",
    "type": "ltd",
    "date_of_creation": "2020-01-15",
    "date_of_cessation": null,
    "registered_office_address": {
      "address_line_1": "123 Business Street",
      "locality": "London",
      "postal_code": "SW1A 1AA",
      "country": "United Kingdom"
    },
    "sic_codes": ["62020", "62090"],
    "accounts": {
      "next_due": "2024-12-31",
      "last_accounts": {
        "made_up_to": "2023-03-31",
        "type": "full"
      }
    },
    "confirmation_statement": {
      "next_due": "2024-01-15",
      "last_made_up_to": "2023-01-15"
    }
  }
}
```

### Get Company Officers
```http
GET /api/companies-house/company/{companyNumber}/officers
Authorization: Bearer {token}
```

## 📊 Dashboard & Analytics

### Get Dashboard Data
```http
GET /api/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 150,
      "pendingTasks": 45,
      "overdueAccounts": 8,
      "thisMonthDeadlines": 23
    },
    "urgentTasks": [
      {
        "id": "task-uuid",
        "client": "Example Ltd",
        "taskType": "ANNUAL_ACCOUNTS",
        "dueDate": "2024-01-20",
        "daysUntilDue": 5
      }
    ],
    "workloadDistribution": [
      {
        "userId": "user-uuid",
        "name": "Jane Accountant",
        "assignedClients": 25,
        "pendingTasks": 12,
        "completedThisMonth": 8
      }
    ],
    "monthlyStats": {
      "accountsCompleted": 35,
      "accountsPending": 45,
      "newClientsAdded": 5,
      "totalRevenue": 25000
    }
  }
}
```

### Get User Analytics
```http
GET /api/dashboard/user-analytics
Authorization: Bearer {token}
```

**Query Parameters:**
- `userId` (optional): Specific user ID (Manager only)
- `period` (optional): Time period (week, month, quarter, year)

## 🔔 Notifications

### Get Notifications
```http
GET /api/notifications
Authorization: Bearer {token}
```

**Query Parameters:**
- `unread` (optional): Filter unread notifications (true, false)
- `type` (optional): Filter by type
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "type": "DEADLINE_REMINDER",
        "title": "Account Deadline Approaching",
        "message": "Example Ltd accounts due in 7 days",
        "isRead": false,
        "actionUrl": "/clients/client-uuid",
        "createdAt": "2024-01-10T09:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

### Mark Notification as Read
```http
PATCH /api/notifications/{notificationId}/read
Authorization: Bearer {token}
```

### Mark All Notifications as Read
```http
POST /api/notifications/mark-all-read
Authorization: Bearer {token}
```

## ❌ Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Specific validation error"
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (business logic error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - Valid token required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `CLIENT_NOT_FOUND` - Requested client doesn't exist
- `USER_NOT_FOUND` - Requested user doesn't exist
- `COMPANIES_HOUSE_ERROR` - External API error
- `EMAIL_SEND_FAILED` - Email delivery failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 🔒 Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Companies House proxy**: 600 requests per 5 minutes (API limit)
- **Email sending**: 10 emails per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Webhooks (Future Feature)

Webhook endpoints for external integrations:

### Companies House Updates
```http
POST /api/webhooks/companies-house
Content-Type: application/json
X-Webhook-Signature: {signature}

{
  "event": "company_updated",
  "company_number": "12345678",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

---

## 🔧 Development & Testing

### Base URLs
- **Development**: `http://localhost:3000/api`
- **Staging**: `https://numericalz-staging.vercel.app/api`
- **Production**: `https://numericalz-internal.vercel.app/api`

### Postman Collection

Import the Postman collection for easy API testing: [Download Collection](./postman/numericalz-api.json)

### SDK (Future)

TypeScript SDK for easy integration:
```typescript
import { NumericalzAPI } from '@numericalz/sdk'

const api = new NumericalzAPI({
  baseUrl: 'https://numericalz-internal.vercel.app/api',
  token: 'your-jwt-token'
})

const clients = await api.clients.getAll()
```

---

This API documentation is automatically generated and kept up-to-date with the latest API changes. For questions or issues, please contact the development team. 