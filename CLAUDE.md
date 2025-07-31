# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive agricultural AI agent frontend application built with Next.js 14, TypeScript, and PostgreSQL. The application provides EC order management, AI-powered chat consultation, dynamic category management, advanced authentication, and a complete admin system for agricultural businesses.

## Key Architecture

### Multi-Tier Authentication System
- **Basic Authentication**: Session-based auth with CSRF protection (`src/lib/auth.ts`)
- **Enhanced Security**: Progressive lockout, rate limiting, Remember Me tokens (`src/lib/auth-enhanced.ts`)
- **Admin Authentication**: Role-based access control with super admin privileges (`src/lib/admin-auth.ts`)
- **Middleware Protection**: Route-based authentication filtering (`src/middleware.ts`)

### Database Architecture
- **Production**: PostgreSQL with Neon database connection pooling
- **Multi-tenancy**: Row Level Security (RLS) with user_id isolation
- **Security Tables**: Sessions, remember_tokens, rate_limits, security_events, admin_audit_logs
- **Dynamic Schema**: Categories, system_settings, api_integrations tables
- **Security Framework**: Comprehensive security utility functions (`src/lib/security.ts`)

### AI Integration
- **Primary**: OpenAI ChatGPT API (gpt-3.5-turbo)
- **Dynamic System Context**: Real-time database statistics and system settings
- **Page-Aware Responses**: Context injection based on current user page location
- **Fallback System**: System-based responses when OpenAI API is unavailable
- **Configurable Prompts**: Admin-managed system prompts in database

## Common Commands

```bash
# Development
npm run dev          # Start development server (access at http://localhost:3000/orders)
npm run build        # Build for production
npm run start        # Start production server

# Quality & Testing
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks

# Database Setup (run after npm run dev starts)
curl -X POST http://localhost:3000/api/migrate-auth
curl -X POST http://localhost:3000/api/migrate-security-enhancements  
curl -X POST http://localhost:3000/api/migrate-admin-system

# Vercel Deployment
vercel               # Deploy to Vercel (requires Vercel CLI)
vercel --prod        # Deploy to production
```

## Development Workflow

1. **Start development**: Run `npm run dev` and access `http://localhost:3000/orders`
2. **Database initialization**: Run migration endpoints after server starts
3. **Always run linting and type checking** before committing changes
4. **Test with different user roles**: regular user (admin/admin123) and super admin (silentogasasoft@gmail.com/Ogasa1995)
5. **Security validation is critical** - ensure all API routes have proper authentication, CSRF protection, and input validation

## Authentication & Security Architecture

### Three-Layer Authentication
1. **Basic Auth** (`/api/auth/*`): Login, logout, password change
2. **Enhanced Security** (`auth-enhanced.ts`): Progressive lockout, rate limiting, Remember Me
3. **Admin System** (`/api/admin/*`): Role-based access with audit logging

### Security Features
- **Progressive Lockout**: 5min → 15min → 30min → 1hr → 2hr → 4hr → 8hr → 24hr
- **Rate Limiting**: API endpoint specific limits (Login: 10/min, Upload: 5/min, Chat: 30/min)
- **Remember Me**: 30-day persistent login with selector/validator pattern
- **Password Security**: bcrypt + salt with configurable complexity
- **Attack Detection**: Password spray, account enumeration, brute force monitoring
- **Security Headers**: Comprehensive security headers via `next.config.js` and `src/lib/security.ts`
- **Input Sanitization**: SQL injection prevention and input validation
- **CSRF Protection**: All authenticated API routes require CSRF token validation

### Middleware Route Protection
- **Public Routes**: `/login`, `/api/auth/login`, `/api/auth/auto-login`
- **Protected Routes**: All `/orders/*`, `/categories/*`, `/dashboard/*`
- **Admin Routes**: `/admin/*`, `/api/admin/*` (super admin only)
- **Session Validation**: Automatic session extension 2 hours before expiry

## API Routes Structure

### Core API Routes (`src/app/api/`)
- `/api/orders` - Multi-tenant order CRUD with user_id isolation
- `/api/categories` - Dynamic category management with user ownership
- `/api/chat` - AI chat with live database context and page awareness
- `/api/upload` - CSV processing with Japanese header mapping
- `/api/upload-with-category` - Category-specific CSV import
- `/api/customers` - Customer data derived from orders
- `/api/shipping` - Yamato Transport API integration (mock)

### Authentication API (`src/app/api/auth/`)
- `/api/auth/login` - Enhanced login with Remember Me support
- `/api/auth/auto-login` - Remember token validation and session creation
- `/api/auth/logout` - Session invalidation with Remember token cleanup
- `/api/auth/me` - Current user session validation
- `/api/auth/change-password` - Password change with security validation

### Admin API (`src/app/api/admin/`)
- `/api/admin/me` - Admin role validation
- `/api/admin/customers` - Cross-user customer data management
- `/api/admin/prompts` - System prompt configuration
- `/api/admin/integrations` - External API integration settings
- `/api/admin/dashboard/*` - System statistics and activity monitoring

## Core Architecture Patterns

### Multi-Tenant Data Isolation
- All user data queries include `WHERE user_id = $1` clauses
- Admin queries can access cross-user data with proper authorization
- Categories and orders are user-scoped with ownership validation
- Database RLS policies enforce tenant separation at PostgreSQL level

### Dynamic Category System
- User-created categories with flexible attributes (color, icon, description)
- Category-order relationships with cascading operations
- Admin can view all categories across users
- Category-specific CSV upload workflows

### Security Utility Framework
- Comprehensive security functions in `src/lib/security.ts`
- Standardized error responses with security headers
- Input sanitization and SQL injection prevention
- Logging sanitization to prevent sensitive data exposure

### Two-Pane Order Management
- Orders separated by delivery date presence (with/without dates)
- Different visual styling (white vs light blue backgrounds)
- Maintains selection state across both panes for bulk operations
- Shipping workflow with multi-select and label generation

### Chat Persistence Strategy
- IndexedDB for local storage with cross-tab synchronization
- BroadcastChannel API for real-time updates across browser tabs
- Graceful fallback when browser APIs are unavailable
- Admin-configurable system prompts with category-based organization

## Admin System Architecture

### Role-Based Access Control
- **Super Admin**: Full system access (silentogasasoft@gmail.com/Ogasa1995)
- **Admin**: Limited administrative functions
- **User**: Standard application access (admin/admin123)
- Database-driven role checking with `is_super_admin` flag

### Admin Dashboard Features
- **System Statistics**: Users, orders, customers, integrations
- **Activity Monitoring**: Real-time admin action logging
- **Customer Management**: Cross-user customer data with search/filter
- **Prompt Configuration**: AI behavior customization by category
- **API Integration Setup**: External service configuration (ColorMi, Tabechoku)

### Audit Logging
- All admin actions logged to `admin_audit_logs` table
- IP address and user agent tracking
- Detailed operation context in JSONB format
- Automatic cleanup of old audit records

## Japanese Business Context

### Localization Features
- Complete Japanese UI with agricultural terminology
- Date formatting with Japanese locale (`date-fns/locale/ja`)
- Currency formatting for Japanese Yen
- CSV import with Japanese headers (注文番号, 顧客名, etc.)
- Agricultural product-specific workflows and terminology

### External API Integration Framework
- **ColorMi Shop**: E-commerce platform integration (planned)
- **Tabechoku**: Direct-from-farm marketplace (planned)
- **Yamato Transport**: Shipping label generation (mock implementation)
- Configurable API settings with connection testing
- Automatic sync scheduling with error handling

## Important Notes

### Entry Points and Navigation
- **Quick Start**: `npm run dev` → `http://localhost:3000/orders`
- **Main Entry**: `/orders` redirects to `/orders/shipping/pending`
- **Admin Panel**: `/admin` requires super admin authentication
- **Order Registration Flow**: choose method → confirm → complete

### Critical Security Considerations
- All API routes must have authentication, CSRF protection, and input validation
- All database operations must include proper user_id filtering for multi-tenancy
- Admin operations require audit logging
- Session tokens are HTTP-only with CSRF protection
- Remember tokens use secure selector/validator pattern
- File uploads must have size limits, type validation, and security scanning

### Database Migration Sequence
1. `/api/migrate-auth` - Basic authentication tables
2. `/api/migrate-security-enhancements` - Advanced security features
3. `/api/migrate-admin-system` - Admin system and settings

## Environment Variables

### Required for Development
- `DATABASE_URL`: PostgreSQL connection string (Neon recommended)
- `OPENAI_API_KEY`: OpenAI API key for chat functionality

### Required for Production
- All development variables plus:
- `YAMATO_API_KEY`: Yamato Transport API key
- `YAMATO_API_SECRET`: Yamato Transport API secret
- `YAMATO_API_BASE_URL`: Yamato API base URL

### Vercel Deployment
- Environment variables are set in Vercel dashboard
- API routes work consistently between development and production
- SSL is automatically handled for database connections

## Security Framework Details

### Comprehensive Security Implementation
The application has undergone extensive security hardening with the following measures:

#### API Route Security Pattern
All protected API routes follow this security pattern:
```typescript
// 1. Session validation
const sessionToken = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
if (!sessionToken) return unauthorized();

// 2. CSRF token validation
const csrfToken = request.headers.get('x-csrf-token');
if (csrfToken !== sessionData.session.csrf_token) return forbidden();

// 3. Input validation and sanitization
// 4. User isolation in database queries
```

#### Security Utilities (`src/lib/security.ts`)
- `addSecurityHeaders()` - Adds comprehensive security headers
- `createErrorResponse()` - Standardized error responses with security headers
- `sanitizeInput()` - Input sanitization and XSS prevention
- `validateSqlInput()` - SQL injection pattern detection
- `sanitizeForLogging()` - Removes sensitive data from logs

#### Rate Limiting Implementation
- Memory-based rate limiting in middleware
- Endpoint-specific limits (login: 10/min, upload: 5/min, chat: 30/min)
- IP-based tracking with automatic window reset

#### File Upload Security
- File size limits (10MB maximum)
- File type validation (CSV only for uploads)
- Content validation and sanitization
- User isolation for uploaded data