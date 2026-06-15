# API Documentation

This document provides comprehensive documentation for all available API endpoints in the Agri AI Agent Frontend system.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most API endpoints require authentication. Authentication is handled via JWT tokens stored in cookies.

### Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticates a user and returns a JWT access token.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token",
    "expiresIn": 3600
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS"
  }
}
```

### Auto-Login (Enhanced)

**Endpoint:** `POST /api/auth/auto-login`

**Description:** Attempts to automatically log in using saved credentials from Remember Me functionality.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "token": "jwt-access-token"
  }
}
```

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Returns the currently authenticated user's information.

**Headers:**

```
Cookie: token=<jwt-token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "string",
    "role": "user|admin|superadmin",
    "preferences": {
      "theme": "light|dark",
      "language": "en|ja"
    }
  }
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logs out the current user by clearing authentication cookies.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### Change Password

**Endpoint:** `POST /api/auth/change-password`

**Description:** Changes the authenticated user's password.

**Request Body:**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

## Orders API

### Get Orders

**Endpoint:** `GET /api/orders`

**Description:** Retrieves a paginated list of orders with filtering and sorting options.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status
- `startDate` (optional): Filter orders after this date
- `endDate` (optional): Filter orders before this date

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-12345",
        "status": "pending|processing|shipped|delivered|cancelled",
        "total": 15000,
        "createdAt": "2026-06-07T10:00:00Z",
        "updatedAt": "2026-06-07T10:00:00Z",
        "customer": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Get Order Details

**Endpoint:** `GET /api/orders/{orderId}`

**Description:** Retrieves detailed information about a specific order.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-12345",
    "status": "processing",
    "total": 15000,
    "items": [
      {
        "productId": "uuid",
        "name": "Organic Apples",
        "quantity": 10,
        "price": 1500,
        "subtotal": 15000
      }
    ],
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+81-90-1234-5678"
    },
    "shipping": {
      "address": {
        "name": "John Doe",
        "address1": "123 Main St",
        "address2": "Apt 4B",
        "city": "Tokyo",
        "postalCode": "100-0001",
        "country": "Japan"
      },
      "method": "yamato",
      "trackingNumber": "YAMATO-123456789"
    },
    "createdAt": "2026-06-07T10:00:00Z",
    "updatedAt": "2026-06-07T12:00:00Z"
  }
}
```

## AI Chat API

### Chat with AI

**Endpoint:** `POST /api/chat`

**Description:** Sends a message to the AI assistant and receives a response with order analysis and recommendations.

**Request Body:**

```json
{
  "message": "Analyze my recent orders and suggest improvements"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "AI response message",
    "analysis": {
      "totalOrders": 10,
      "avgOrderValue": 12500,
      "topProducts": ["Organic Apples", "Fresh Vegetables"],
      "recommendations": ["Consider bundling organic apples with vegetables for better sales"]
    },
    "timestamp": "2026-06-07T14:30:00Z"
  }
}
```

## AI Insights API

### Get AI Insights

**Endpoint:** `GET /api/ai-insights`

**Description:** Retrieves aggregated AI-generated insights about customer orders and trends.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "sales_trend",
        "title": "Weekly Sales Trend",
        "description": "Sales increased by 15% this week compared to last week",
        "data": {
          "week1": 100000,
          "week2": 115000,
          "change": 15
        },
        "confidence": 0.85
      },
      {
        "type": "customer_behavior",
        "title": "Popular Products",
        "description": "Organic apples are the top-selling product this month",
        "data": {
          "topProduct": "Organic Apples",
          "salesCount": 500,
          "share": 35
        },
        "confidence": 0.92
      }
    ],
    "lastUpdated": "2026-06-07T12:00:00Z"
  }
}
```

## Customers API

### Get Customers

**Endpoint:** `GET /api/customers`

**Description:** Retrieves a paginated list of customers with filtering options.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or email
- `role` (optional): Filter by role

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+81-90-1234-5678",
        "role": "user",
        "totalOrders": 10,
        "totalSpent": 125000,
        "joinedDate": "2026-01-01T00:00:00Z",
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### Get Customer Details

**Endpoint:** `GET /api/customers/{customerId}`

**Description:** Retrieves detailed information about a specific customer.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+81-90-1234-5678",
    "role": "user",
    "totalOrders": 10,
    "totalSpent": 125000,
    "joinedDate": "2026-01-01T00:00:00Z",
    "lastOrderDate": "2026-06-07T10:00:00Z",
    "status": "active",
    "addresses": [
      {
        "type": "home",
        "address": "123 Main St, Tokyo, Japan"
      }
    ],
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-12345",
        "total": 15000,
        "status": "processing",
        "createdAt": "2026-06-07T10:00:00Z"
      }
    ]
  }
}
```

## Admin Dashboard API

### Get Dashboard Stats

**Endpoint:** `GET /api/admin/dashboard/stats`

**Description:** Retrieves aggregated statistics for the admin dashboard.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalOrders": 1500,
    "totalRevenue": 187500000,
    "totalCustomers": 500,
    "activeUsers": 350,
    "conversionRate": 0.72,
    "avgOrderValue": 125000,
    "revenueChange": 15.3,
    "customerGrowth": 12.5,
    "ordersChange": 8.2
  }
}
```

### Get Dashboard Activities

**Endpoint:** `GET /api/admin/dashboard/activities`

**Description:** Retrieves recent admin activities for the dashboard.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "action": "order_created|order_updated|customer_added",
        "description": "Order ORD-12345 was created",
        "timestamp": "2026-06-07T14:30:00Z",
        "user": {
          "id": "uuid",
          "name": "Admin User"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## Security API

### Get Rate Limit Stats

**Endpoint:** `GET /api/admin/security/rate-limits`

**Description:** Retrieves rate limit statistics for security monitoring.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ipRateLimits": [
      {
        "ip": "192.168.1.1",
        "attempts": 150,
        "limit": 100,
        "blocked": false,
        "lastAttempt": "2026-06-07T14:30:00Z"
      }
    ],
    "overallAttempts": 5000,
    "overallLimit": 50000,
    "blockedAttempts": 50,
    "blockedRate": 0.01
  }
}
```

### Get Security Events

**Endpoint:** `GET /api/admin/security/events`

**Description:** Retrieves recent security events and alerts.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by event type

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "type": "login_failed|rate_limit_exceeded|suspicious_activity",
        "severity": "low|medium|high|critical",
        "description": "Multiple failed login attempts from IP 192.168.1.100",
        "ip": "192.168.1.100",
        "timestamp": "2026-06-07T14:30:00Z",
        "status": "investigating|resolved|blocked"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## Yamato Shipping API

### Get Yamato API Settings

**Endpoint:** `GET /api/yamato`

**Description:** Retrieves Yamato shipping API configuration.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "apiKey": "sk-***",
    "apiSecret": "sk-***",
    "apiBaseUrl": "https://api.yamato.co.jp/v1",
    "enabled": true,
    "lastSync": "2026-06-07T12:00:00Z"
  }
}
```

## Error Responses

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2026-06-07T14:30:00Z"
  }
}
```

**Common Error Codes:**

- `AUTHENTICATION_FAILED`: Invalid or missing authentication token
- `NOT_AUTHORIZED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `SERVER_ERROR`: Internal server error

## Testing the API

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get Orders
curl -X GET http://localhost:3000/api/orders \
  -H "Cookie: token=<your-token>"
```

### Using JavaScript Fetch

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password',
  }),
});

const data = await response.json();

// Get Orders
const ordersResponse = await fetch('http://localhost:3000/api/orders', {
  headers: {
    Cookie: `token=${data.data.token}`,
  },
});

const ordersData = await ordersResponse.json();
```

## Rate Limiting

API endpoints may have rate limits to prevent abuse. Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `X-RateLimit-Used`: Requests used this window

## Pagination

Most list endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Paged responses include pagination metadata:

- `pagination.page`: Current page number
- `pagination.limit`: Items per page
- `pagination.total`: Total number of items
- `pagination.totalPages`: Total number of pages

## Time Zones

All timestamps are in UTC format: `YYYY-MM-DDTHH:mm:ssZ`

## Versioning

Current API version: `v1`

Future versions will use URL versioning: `/api/v2/...`
