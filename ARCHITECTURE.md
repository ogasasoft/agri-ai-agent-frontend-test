# Architecture Documentation

## Overview

The Agri AI Agent Frontend is a comprehensive e-commerce integration management system designed for agricultural businesses. This document provides an in-depth look at the system architecture, design decisions, and component interactions.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Patterns](#architecture-patterns)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [API Design](#api-design)
- [Database Schema](#database-schema)
- [Security Architecture](#security-architecture)
- [State Management](#state-management)
- [Testing Strategy](#testing-strategy)
- [Performance Optimization](#performance-optimization)

## System Overview

### Purpose

Agri AI Agent Frontend provides a unified interface for:
- E-commerce order management from multiple platforms
- AI-powered order data analysis and recommendations
- Customer management and integration
- Shipping management with Yamato Transport API
- Secure authentication and authorization
- Admin system management

### Key Components

1. **Authentication System**: Multi-factor authentication, remember me, rate limiting
2. **Order Management**: Unified order interface from multiple EC platforms
3. **AI Chat**: OpenAI-powered chat for data analysis
4. **Customer Management**: Centralized customer data
5. **Shipping Management**: Yamato Transport API integration
6. **Admin System**: Super admin management interface

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.4
- **UI Library**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query
- **Routing**: React Router v7

#### Backend
- **API Routes**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **Authentication**: Session + JWT
- **Security**: bcryptjs, Rate limiting

#### AI & Integrations
- **AI**: OpenAI GPT-3.5-turbo
- **Yamato Transport**: Shipping API
- **ColorMe Shop**: E-commerce sync
- **Tabechoku**: Food ordering API

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────┐
│        Presentation Layer           │
│   (Components, Pages, UI)           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Business Logic Layer        │
│  (Services, Hooks, Utilities)       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Data Access Layer           │
│  (Database Queries, API Clients)    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│           Data Layer                │
│     (Database, External APIs)        │
└─────────────────────────────────────┘
```

### 2. Feature-First Architecture

The application is organized around features:
- `app/orders/` - Order management
- `app/admin/` - Admin functionality
- `app/auth/` - Authentication
- `app/chat/` - AI chat interface

### 3. Component Architecture

Uses a combination of:
- **Container/Presentational Pattern**: Separate logic and UI
- **Compound Components**: Complex UI composed of simpler parts
- **Composition over Inheritance**: Flexible component composition

## Component Architecture

### Core Components

#### Layout Components
- `Header`: Navigation with user info and theme toggle
- `Footer`: Links and information
- `ThemeProvider`: Dark mode context provider

#### Feature Components
- `OrderRegister`: Order creation form
- `OrderShipping`: Shipping label generation
- `CustomerList`: Customer management
- `AdminDashboard`: Super admin interface
- `ChatInterface`: AI chat system

#### UI Components
- Forms with validation
- Tables with sorting/filtering
- Modals and dialogs
- Toast notifications
- Progress indicators

### Custom Hooks

- `useAuth`: Authentication state and methods
- `useOrders`: Order management
- `useCustomers`: Customer management
- `useChat`: AI chat functionality
- `useToast`: Toast notifications

### Utility Libraries

- `auth.ts`: Authentication helpers
- `auth-enhanced.ts`: Enhanced security features
- `admin-auth.ts`: Admin authentication
- `reviews.ts`: Review system utilities

## Data Flow

### Order Creation Flow

```
User fills form
  ↓
Client-side validation (React Hook Form + Zod)
  ↓
Form submission
  ↓
API Route: /api/orders
  ↓
Database write (orders table)
  ↓
Customer auto-generation (customers table)
  ↓
Success toast + Redirect
```

### AI Chat Flow

```
User types message
  ↓
Context extracted (current page, database stats)
  ↓
Message sent to OpenAI API
  ↓
API Route: /api/chat
  ↓
System prompt injected
  ↓
OpenAI GPT-3.5-turbo processing
  ↓
Response returned with live data
  ↓
UI display
```

### Shipping Label Flow

```
User selects order
  ↓
API Route: /api/shipping/label
  ↓
Fetch order details
  ↓
Yamato Transport API call
  ↓
Label data returned
  ↓
Display label preview
  ↓
Download button
```

## API Design

### Authentication Endpoints

#### POST /api/auth/login
- Input: Email, password
- Output: User token, session info
- Security: Rate limiting, CSRF protection

#### POST /api/auth/register
- Input: Email, password, username
- Output: User token, session info
- Security: Password validation, rate limiting

#### POST /api/auth/logout
- Input: None
- Output: Success message
- Security: Session invalidation

### Order Endpoints

#### GET /api/orders
- Query: page, limit, filters
- Output: Order list with pagination
- Auth: Protected, role-based

#### POST /api/orders
- Input: Order data
- Output: Created order ID
- Auth: Protected

#### GET /api/orders/[id]
- Output: Order details
- Auth: Protected

#### POST /api/orders/[id]/ship
- Input: Shipping details
- Output: Label URL
- Auth: Protected, admin only

### AI Chat Endpoints

#### POST /api/chat
- Input: Message, context
- Output: AI response
- Auth: Protected
- Security: Rate limiting

## Database Schema

### Core Tables

#### users
- id (UUID, PK)
- email (text, unique)
- username (text, unique)
- password_hash (text)
- role (enum: user, admin, super_admin)
- created_at (timestamp)

#### orders
- id (UUID, PK)
- order_code (text, unique)
- customer_id (UUID, FK)
- platform (enum: colorme, tabechoku, manual)
- total_amount (decimal)
- status (enum: pending, shipped, delivered, cancelled)
- created_at (timestamp)
- updated_at (timestamp)

#### customers
- id (UUID, PK)
- user_id (UUID, FK)
- name (text)
- phone (text)
- email (text)
- address (text)
- created_at (timestamp)

#### sessions
- id (UUID, PK)
- user_id (UUID, FK)
- token (text)
- ip_address (text)
- user_agent (text)
- expires_at (timestamp)

#### system_settings
- id (UUID, PK)
- key (text, unique)
- value (text)
- description (text)

### Security Tables

#### remember_tokens
- id (UUID, PK)
- user_id (UUID, FK)
- token (text)
- expires_at (timestamp)

#### rate_limits
- id (UUID, PK)
- identifier (text)
- attempts (int)
- expires_at (timestamp)

#### audit_logs
- id (UUID, PK)
- user_id (UUID, FK)
- action (text)
- entity_type (text)
- entity_id (UUID)
- ip_address (text)
- timestamp (timestamp)

## Security Architecture

### Authentication Layers

1. **Session-Based Auth**: Server-side sessions with CSRF protection
2. **JWT Tokens**: For stateless authentication
3. **Remember Me**: Extended session tokens
4. **Multi-Factor Auth**: Future enhancement

### Security Features

#### Input Validation
- React Hook Form with Zod schemas
- Server-side validation
- Parameterized queries (SQL injection prevention)

#### Rate Limiting
- IP-based: 20 requests per 15 minutes
- User-based: 5 attempts per 5 minutes
- Progressive lockout (5 min → 24 hours)

#### CSRF Protection
- SameSite cookies
- CSRF tokens on sensitive operations
- Token validation in all POST/PUT/DELETE requests

#### Password Security
- bcrypt hashing with salt
- Minimum password requirements
- Password strength validation

#### Data Protection
- Field masking (田中太郎 → 田***郎)
- Secure session management
- Row Level Security (RLS) in PostgreSQL

## State Management

### Local State
- React `useState` for UI state
- React `useReducer` for complex state logic

### Context
- ThemeProvider: Dark mode state
- SessionProvider: User session state

### External State
- Zustand stores for global state
- TanStack Query for server state caching

### Example Store Structure

```typescript
// stores/useAuthStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
}
```

## Testing Strategy

### Test Coverage

#### Unit Tests
- Utility functions
- Custom hooks
- Form validation logic
- Data transformation

#### Component Tests
- React components
- User interactions
- Form submissions
- Navigation

#### Integration Tests
- API routes
- Database operations
- External API integrations
- Authentication flow

### Test Structure

```
src/__tests__/
├── components/
│   ├── auth/
│   ├── orders/
│   ├── customers/
│   └── admin/
├── lib/
├── hooks/
└── pages/
```

## Performance Optimization

### Frontend Optimization
1. **Code Splitting**: Dynamic imports for lazy loading
2. **Image Optimization**: Next.js Image component
3. **Tree Shaking**: Remove unused code
4. **Bundle Compression**: Gzip/Brotli compression

### Backend Optimization
1. **Database Indexing**: Optimized query performance
2. **Connection Pooling**: Reuse database connections
3. **Query Optimization**: Efficient SQL queries
4. **API Caching**: TanStack Query caching

### Loading Optimization
1. **Skeleton Loading**: Show loading states
2. **Progress Indicators**: Real-time feedback
3. **Debouncing**: Delay rapid actions
4. **Prefetching**: Preload data when possible

## Future Architecture Enhancements

### Planned Features
- Microservices architecture
- GraphQL API layer
- Real-time notifications (WebSockets)
- Advanced analytics dashboard
- Multi-language support

### Scalability Improvements
- Horizontal scaling setup
- CDN integration
- Load balancing
- Database sharding (future)

---

Last Updated: 2026-06-16
