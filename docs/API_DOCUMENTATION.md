# API Documentation - Numericalz Internal Management System

## 🎯 Overview

This document provides comprehensive documentation for all API endpoints in the Numericalz Internal Management System. All endpoints require authentication unless otherwise specified.

## 🔐 Authentication

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://numericalz.cloud9digital.in/api`

### Authentication Method
All API endpoints use NextAuth.js session-based authentication. Include session cookies with all requests.

### Response Format
All API responses follow this standard format:
```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string
}
```

## 👤 Authentication Endpoints

### Login
**POST** `/auth/[...nextauth]`

NextAuth.js handles authentication. Use the `signIn` function from `next-auth/react`.

```typescript
import { signIn } from 'next-auth/react'

const result = await signIn('credentials', {
  email: 'admin@numericalz.com',
  password: 'admin123',
  redirect: false
})
```

## 🏢 Client Management

### Get All Clients
**GET** `/clients`

Retrieve all clients with optional filtering and pagination.

**Query Parameters:**
- `search` (optional): Search term for client name or company number
- `assignedUserId` (optional): Filter by assigned user
- `isActive` (optional): Filter by active status (true/false)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client-id",
        "clientCode": "CLI001",
        "companyName": "Example Ltd",
        "companyNumber": "12345678",
        "companyType": "LIMITED_COMPANY",
        "companyStatus": "active",
        "contactName": "John Doe",
        "contactEmail": "john@example.com",
        "contactPhone": "+44 20 1234 5678",
        "nextAccountsDue": "2024-12-31T00:00:00.000Z",
        "nextConfirmationDue": "2024-06-30T00:00:00.000Z",
        "assignedUser": {
          "id": "user-id",
          "name": "Jane Smith",
          "email": "jane@numericalz.com"
        },
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    }
  }
}
```

### Get Client by ID
**GET** `/clients/[id]`

Retrieve detailed information for a specific client.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "client-id",
    "clientCode": "CLI001",
    "companyName": "Example Ltd",
    "companyNumber": "12345678",
    "companyType": "LIMITED_COMPANY",
    "companyStatus": "active",
    "companyStatusDetail": null,
    "incorporationDate": "2020-01-01T00:00:00.000Z",
    "registeredOfficeAddress": "{\"address_line_1\":\"123 Business St\",\"locality\":\"London\",\"postal_code\":\"SW1A 1AA\"}",
    "sicCodes": "[\"62020\",\"62090\"]",
    "contactName": "John Doe",
    "contactEmail": "john@example.com",
    "contactPhone": "+44 20 1234 5678",
    "website": "https://example.com",
    "tradingAddress": "123 Trading St, London",
    "nextAccountsDue": "2024-12-31T00:00:00.000Z",
    "lastAccountsMadeUpTo": "2023-12-31T00:00:00.000Z",
    "nextConfirmationDue": "2024-06-30T00:00:00.000Z",
    "accountingReferenceDate": "{\"day\":\"31\",\"month\":\"12\"}",
    "assignedUser": {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@numericalz.com"
    },
    "officers": "[{\"name\":\"John Doe\",\"role\":\"director\"}]",
    "personsWithSignificantControl": "[{\"name\":\"John Doe\",\"nature_of_control\":[\"ownership-of-shares-25-to-50-percent\"]}]",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Create Client
**POST** `/clients`

Create a new client record.

**Request Body:**
```json
{
  "companyNumber": "12345678",
  "companyName": "Example Ltd",
  "contactName": "John Doe",
  "contactEmail": "john@example.com",
  "contactPhone": "+44 20 1234 5678",
  "website": "https://example.com",
  "tradingAddress": "123 Trading St, London",
  "residentialAddress": "456 Home St, London",
  "yearEstablished": 2020,
  "numberOfEmployees": 10,
  "annualTurnover": 500000,
  "assignedUserId": "user-id",
  "notes": "Important client notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-client-id",
    "clientCode": "CLI002",
    // ... full client object
  },
  "message": "Client created successfully"
}
```

### Update Client
**PUT** `/clients/[id]`

Update an existing client record.

**Request Body:** Same as Create Client

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated client object
  },
  "message": "Client updated successfully"
}
```

### Delete Client
**DELETE** `/clients/[id]`

Soft delete a client (sets isActive to false).

**Response:**
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

## 🔄 Client Assignment

### Assign Client to User
**POST** `/clients/[id]/assign`

Assign a client to a team member.

**Request Body:**
```json
{
  "assignedUserId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated client object
  },
  "message": "Client assigned successfully"
}
```

### Reassign Client
**POST** `/clients/[id]/reassign`

Reassign a client to a different team member.

**Request Body:**
```json
{
  "newAssignedUserId": "new-user-id",
  "reason": "Workload balancing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated client object
  },
  "message": "Client reassigned successfully"
}
```

### Refresh Companies House Data
**POST** `/clients/[id]/refresh-companies-house`

Update client with latest Companies House information.

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated client object with latest CH data
  },
  "message": "Client updated with latest Companies House data"
}
```

## 📊 Bulk Operations

### Bulk Assign Clients
**POST** `/clients/bulk-assign`

Assign multiple clients to users simultaneously.

**Request Body:**
```json
{
  "clientIds": ["client-id-1", "client-id-2"],
  "assignedUserId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successCount": 2,
    "failureCount": 0,
    "results": [
      {
        "clientId": "client-id-1",
        "success": true,
        "clientName": "Example Ltd"
      }
    ]
  },
  "message": "Bulk assignment completed"
}
```

### Bulk Refresh Companies House
**POST** `/clients/bulk-refresh`

Refresh multiple clients with latest Companies House data.

**Request Body:**
```json
{
  "clientIds": ["client-id-1", "client-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "clientId": "client-id-1",
        "success": true,
        "clientName": "Example Ltd"
      }
    ]
  },
  "message": "Bulk refresh completed"
}
```

### Bulk Resign Clients
**POST** `/clients/bulk-resign`

Remove assignments from multiple clients.

**Request Body:**
```json
{
  "clientIds": ["client-id-1", "client-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successCount": 2,
    "failureCount": 0,
    "results": [
      {
        "clientId": "client-id-1",
        "success": true,
        "clientName": "Example Ltd"
      }
    ]
  },
  "message": "Bulk resignation completed"
}
```

## 🏢 Companies House Integration

### Search Companies
**GET** `/companies-house/search`

Search for UK companies using Companies House API.

**Query Parameters:**
- `q`: Search query (company name or number) - **Required**
- `items_per_page`: Results per page (default: 20, max: 100)
- `start_index`: Starting index (default: 0)

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
**GET** `/companies-house/company/[companyNumber]`

Get comprehensive company information including officers and PSC data.

**Response:**
```json
{
  "success": true,
  "data": {
    "company_number": "12345678",
    "company_name": "EXAMPLE LIMITED",
    "company_status": "active",
    "company_status_detail": null,
    "type": "ltd",
    "date_of_creation": "2020-01-15",
    "registered_office_address": {
      "address_line_1": "123 Business Street",
      "locality": "London",
      "postal_code": "SW1A 1AA",
      "country": "England"
    },
    "sic_codes": ["62020", "62090"],
    "accounts": {
      "next_due": "2024-12-31",
      "last_accounts": {
        "made_up_to": "2023-12-31",
        "type": "full"
      },
      "accounting_reference_date": {
        "day": "31",
        "month": "12"
      }
    },
    "confirmation_statement": {
      "next_due": "2024-06-30",
      "last_made_up_to": "2023-06-30"
    },
    "officers": [
      {
        "name": "John DOE",
        "officer_role": "director",
        "appointed_on": "2020-01-15"
      }
    ],
    "psc": [
      {
        "name": "John DOE",
        "nature_of_control": ["ownership-of-shares-25-to-50-percent"]
      }
    ]
  }
}
```

## 👥 User Management

### Get All Users
**GET** `/users`

Retrieve all users (Manager only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@numericalz.com",
      "role": "STAFF",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "assignedClients": 15
      }
    }
  ]
}
```

### Get User by ID
**GET** `/users/[id]`

Get detailed user information including assigned clients.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "Jane Smith",
    "email": "jane@numericalz.com",
    "role": "STAFF",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "assignedClients": [
      {
        "id": "client-id",
        "companyName": "Example Ltd",
        "clientCode": "CLI001"
      }
    ]
  }
}
```

### Get Team Statistics
**GET** `/users/team`

Get comprehensive team statistics (Manager only).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "activeUsers": 4,
    "totalClients": 100,
    "assignedClients": 85,
    "unassignedClients": 15,
    "users": [
      {
        "id": "user-id",
        "name": "Jane Smith",
        "email": "jane@numericalz.com",
        "role": "STAFF",
        "clientCount": 15,
        "workloadPercentage": 75
      }
    ],
    "workloadDistribution": {
      "balanced": 3,
      "overloaded": 1,
      "underutilized": 1
    }
  }
}
```

## 🔍 Debug Endpoints

### System Status
**GET** `/debug`

Get system status and configuration (Development only).

**Response:**
```json
{
  "success": true,
  "data": {
    "environment": "development",
    "database": "connected",
    "companiesHouse": "configured",
    "auth": "enabled",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **429**: Too Many Requests - Rate limit exceeded
- **500**: Internal Server Error - Server error

### Common Error Codes
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `COMPANIES_HOUSE_ERROR`: Companies House API error
- `DATABASE_ERROR`: Database operation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests

## 🔒 Security

### Authentication
All endpoints require valid NextAuth.js session except:
- `/auth/[...nextauth]` - Authentication endpoint

### Authorization
- **Manager Role**: Access to all endpoints
- **Staff Role**: Limited access to assigned clients only

### Rate Limiting
- Companies House API: 600 requests per 5 minutes
- Internal APIs: No specific limits (handled by Vercel)

### Data Validation
All endpoints use Zod schemas for input validation:
- Required fields validation
- Data type validation
- Format validation (email, phone, etc.)
- Business rule validation

## 📝 Usage Examples

### JavaScript/TypeScript
```typescript
// Get all clients
const response = await fetch('/api/clients', {
  credentials: 'include' // Include session cookies
})
const data = await response.json()

// Create a client
const newClient = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    companyName: 'Example Ltd',
    contactName: 'John Doe',
    contactEmail: 'john@example.com'
  })
})
```

### React Hook Example
```typescript
import { useSession } from 'next-auth/react'

function useClients() {
  const { data: session } = useSession()
  
  const fetchClients = async () => {
    if (!session) return
    
    const response = await fetch('/api/clients')
    return response.json()
  }
  
  return { fetchClients }
}
```

---

**Note**: This API documentation reflects the current implementation of the Numericalz Internal Management System. All endpoints are production-ready and actively used in the application. 