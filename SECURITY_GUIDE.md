# Security Guide - Agri AI Agent Frontend

This comprehensive security guide explains the security features implemented in the Agri AI Agent Frontend system.

## Table of Contents

1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Protection](#data-protection)
5. [Security Best Practices](#security-best-practices)
6. [Compliance & Standards](#compliance--standards)
7. [Security Operations](#security-operations)
8. [Security Policy](#security-policy)
9. [Reporting Security Issues](#reporting-security-issues)

## Overview

The Agri AI Agent Frontend implements a comprehensive security architecture designed to protect:

- User data and credentials
- Authentication sessions
- API integrations and tokens
- Database transactions
- System configurations

### Security Features

- ✅ Multi-factor authentication (MFA)
- ✅ Session management with automatic renewal
- ✅ CSRF protection
- ✅ Remember Me functionality
- ✅ Progressive account lockout
- ✅ Rate limiting per IP
- ✅ Password spray attack detection
- ✅ Row-level security (RLS)
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ Input validation and sanitization
- ✅ Environment variable management
- ✅ Secure password hashing
- ✅ Audit logging
- ✅ Security event monitoring

## Authentication System

### Multi-Factor Authentication (MFA)

The system implements MFA with two-factor authentication:

1. **Primary Factor**: Email/username and password
2. **Secondary Factor**: Time-based one-time password (TOTP) or SMS code

**Implementation Details:**

```typescript
// MFA configuration
const MFA_CONFIG = {
  enabled: true,
  totp_enabled: true,
  sms_enabled: true,
  backup_codes: true,
  session_timeout: 7200000, // 2 hours
  remember_me_duration: 2592000000 // 30 days
}
```

**Flow:**

1. User enters credentials
2. Password validation (bcrypt + salt)
3. If MFA enabled, request TOTP/SMS code
4. Verify code (HMAC-based)
5. Generate session token with CSRF protection
6. Set Remember Me cookie if requested

**Session Management:**

```typescript
// Session structure
interface Session {
  user_id: string
  role: 'user' | 'admin' | 'super_admin'
  mfa_verified: boolean
  csrf_token: string
  expires_at: Date
  created_at: Date
  last_activity: Date
}
```

**CSRF Protection:**

- All POST/PUT/DELETE requests include CSRF token
- Token generated on session creation
- Token validated on each sensitive request
- Token rotated on session renewal

### Remember Me Functionality

**Security Considerations:**

- Token-based authentication with 30-day validity
- Token stored in secure HttpOnly cookie
- Not suitable for highly sensitive operations
- Validated on each authentication-sensitive request
- Revoked on password change or security event

**Token Structure:**

```typescript
interface RememberMeToken {
  token: string
  user_id: string
  device_fingerprint: string
  expires_at: Date
  created_at: Date
}
```

### Session Renewal

Sessions automatically extend 2 hours before expiration:

- Every 60 minutes, user activity triggers renewal
- Non-active sessions expire after 4 hours
- Emergency logout via security event

## Authorization & Access Control

### Role-Based Access Control (RBAC)

Three-tier role system:

#### 1. **User Role**

**Capabilities:**
- View and manage own orders
- Access customer data (auto-generated)
- Use AI chat features
- View own account information
- Update password

**Restrictions:**
- No access to admin panels
- No API integration management
- No customer data for other users

#### 2. **Admin Role**

**Capabilities:**
- All user capabilities
- Customer management (all users)
- Prompt configuration
- API integration management
- Security monitoring
- Audit log viewing

**Restrictions:**
- No super admin privileges
- Cannot modify system settings
- Cannot access other admin functions

#### 3. **Super Admin Role**

**Capabilities:**
- All admin capabilities
- System-wide settings
- User management (all users and admins)
- Security policy management
- Audit log viewing
- API key management

**Restrictions:**
- None (full system access)

### Permission Matrix

| Permission | User | Admin | Super Admin |
|------------|------|-------|-------------|
| View own orders | ✅ | ✅ | ✅ |
| Manage own orders | ✅ | ✅ | ✅ |
| View all customers | ❌ | ✅ | ✅ |
| Manage all customers | ❌ | ✅ | ✅ |
| View AI chat history | ✅ | ✅ | ✅ |
| Configure AI prompts | ❌ | ✅ | ✅ |
| Manage API integrations | ❌ | ✅ | ✅ |
| Security monitoring | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| API key management | ❌ | ❌ | ✅ |

### Route Protection

All protected routes validate:

1. Session existence and validity
2. CSRF token presence
3. Required role permissions
4. Remember Me token (if applicable)
5. Rate limit per IP

**Example Implementation:**

```typescript
// Route protection middleware
function protectRoute(requiredRole?: string) {
  return async (req: NextRequest) => {
    // 1. Check session
    const session = await getSession(req)
    if (!session) {
      return unauthorizedResponse()
    }

    // 2. Check MFA verification
    if (requiredRole && session.mfa_verified !== true) {
      return mfa_required_response()
    }

    // 3. Check role permissions
    if (requiredRole && session.role !== requiredRole) {
      return forbidden_response()
    }

    // 4. Validate CSRF token
    const csrfToken = req.headers.get('x-csrf-token')
    if (!csrfToken || csrfToken !== session.csrf_token) {
      return csrf_token_invalid_response()
    }

    // 5. Check rate limit
    const rateLimit = await checkRateLimit(req.ip)
    if (!rateLimit.allowed) {
      return rate_limit_exceeded_response()
    }

    // 6. Renew session if needed
    if (isSessionExpiringSoon(session.expires_at)) {
      await renewSession(session.user_id)
    }

    return null // Proceed to route
  }
}
```

## Data Protection

### Personal Information Masking

All personal data is masked for security:

**Format:**
- **Full Name**: `田中太郎` → `田***郎`
- **Email**: `taro@example.com` → `t***@example.com`
- **Phone**: `090-1234-5678` → `090-***-****`
- **ID**: `user-12345` → `user-123**`

**Implementation:**

```typescript
function maskPersonalData(data: PersonalData): MaskedData {
  return {
    name: maskString(data.name, 1),
    email: maskEmail(data.email),
    phone: maskPhone(data.phone),
    id: maskId(data.id)
  }
}

function maskString(value: string, visibleChars: number): string {
  const hiddenChars = Math.max(0, value.length - visibleChars)
  return value.substring(0, visibleChars) + '*'.repeat(hiddenChars)
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `***@${domain}`
  }
  return `${local.substring(0, 1)}${'*'.repeat(local.length - 2)}@${domain}`
}

function maskPhone(phone: string): string {
  const match = phone.match(/^(\d{3})-(\d{4})-(\d{4})$/)
  if (!match) return phone
  return `${match[1]}-****-${match[3]}`
}
```

### Password Security

**Hashing Algorithm:**

- **Algorithm**: bcrypt (cost factor 12)
- **Salt**: Auto-generated 16-byte salt
- **Hash Length**: 60 characters
- **Iterations**: 12 rounds (adjustable)

**Implementation:**

```typescript
import bcrypt from 'bcryptjs'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
```

**Password Requirements:**

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Database Security

**Row-Level Security (RLS):**

PostgreSQL RLS policies ensure multi-tenant isolation:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY users_select_own
ON users FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only update their own data
CREATE POLICY users_update_own
ON users FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Admins can see all data
CREATE POLICY users_select_all
ON users FOR SELECT
TO admin
USING (true);
```

**SQL Injection Prevention:**

- Always use parameterized queries
- Never concatenate user input into SQL
- Use connection pool with prepared statements
- Validate and sanitize all inputs

**Example (Safe):**

```typescript
// Safe: Parameterized query
const result = await db.query(
  'SELECT * FROM orders WHERE user_id = $1 AND created_at > $2',
  [userId, startDate]
)
```

**Example (Unsafe):**

```typescript
// Unsafe: SQL injection risk
const result = await db.query(
  `SELECT * FROM orders WHERE user_id = '${userId}' AND created_at > '${startDate}'`
)
```

### API Security

**Rate Limiting:**

- **Per IP**: 20 requests per 15 minutes
- **Per User**: 100 requests per hour
- **Per Endpoint**: 50 requests per minute
- **Blocking**: 1 hour after threshold exceeded

**Implementation:**

```typescript
import { rateLimit } from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
      retry_after: calculateRetryAfter()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})
```

**Input Validation:**

All user inputs are validated before processing:

```typescript
import { z } from 'zod'

const orderSchema = z.object({
  customer_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })),
  total: z.number().positive()
})

function validateOrderInput(data: unknown): Order {
  return orderSchema.parse(data)
}
```

## Security Best Practices

### Development

**1. Environment Variables**

All sensitive data must be in environment variables:

```bash
# .env.local
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
OPENAI_API_KEY=sk-your-api-key
YAMATO_API_KEY=your-key
YAMATO_API_SECRET=your-secret
```

**2. Git Security**

- Never commit `.env.local` files
- Use `.gitignore` to exclude sensitive files
- Never expose API keys in code or comments

**3. Code Review**

- All code changes require review
- Security-sensitive changes reviewed by security team
- Regular security audits

### Deployment

**1. Secrets Management**

- Use environment variables for all secrets
- Rotate secrets regularly
- Use secret managers for production (AWS Secrets Manager, etc.)

**2. Database Backups**

- Daily automated backups
- Backups stored in encrypted format
- Backup retention: 30 days
- Test restoration procedures

**3. SSL/TLS**

- HTTPS enforced for all connections
- TLS 1.2 or higher
- HSTS enabled
- Certificate auto-renewal

### Operational

**1. Monitoring**

- Security event logging
- Real-time threat detection
- Anomaly detection
- Regular log reviews

**2. Incident Response**

- 24/7 security monitoring
- Incident response team
- Regular security drills
- Documentation and playbooks

## Compliance & Standards

### Security Standards

**GDPR Compliance:**

- Data minimization
- Right to access
- Right to erasure (right to be forgotten)
- Data portability
- Privacy by design

**Security Frameworks:**

- OWASP Top 10
- NIST Cybersecurity Framework
- ISO 27001:2013 (in progress)
- SOC 2 Type II (planned)

### Data Privacy

**Data Collection:**

- Collect only necessary data
- Inform users about data collection
- Obtain explicit consent
- Provide data access and deletion options

**Data Usage:**

- Only use data for intended purposes
- Process data securely
- Limit data access to authorized personnel
- Regularly review data access

## Security Operations

### Audit Logging

All security-relevant events are logged:

**Log Types:**

1. **Authentication Events**
   - Successful login
   - Failed login attempts
   - Password changes
   - MFA verification

2. **Authorization Events**
   - Permission checks
   - Access denied attempts
   - Role changes

3. **Data Access Events**
   - Data retrieval
   - Data modification
   - Data export

4. **Security Events**
   - Security alerts
   - Policy violations
   - System changes

**Log Retention:**

- 90 days for security logs
- 7 years for compliance logs
- Secure storage and access controls

### Security Events Monitoring

**Alerts Triggers:**

- Failed login attempts > 5 in 5 minutes
- Password spray attack detected
- Account lockout after threshold
- Unusual access patterns
- Security policy violations

**Alert Channels:**

- Real-time email notifications
- SMS alerts for critical events
- Integration with security monitoring systems

## Security Policy

### Access Policy

**Who Can Access:**

- Users: Access own data
- Admins: Access system and user data within role
- Super Admins: Full system access

**Access Controls:**

- Role-based access
- Least privilege principle
- Regular access reviews

### Data Policy

**Data Classification:**

1. **Public**: No restrictions
2. **Internal**: Limited access
3. **Confidential**: Role-based access
4. **Restricted**: Special authorization

**Data Protection:**

- Encryption at rest (database)
- Encryption in transit (TLS 1.3)
- Access controls
- Auditing

### Incident Response Policy

**Response Time:**

- Critical: < 15 minutes
- High: < 1 hour
- Medium: < 4 hours
- Low: < 24 hours

**Roles:**

- Security Team: Incident response
- Development Team: Technical remediation
- Management: Communication and decisions

## Reporting Security Issues

### Vulnerability Disclosure

**How to Report:**

1. Email: security@example.com
2. Encrypted communication preferred
3. Include: Description, impact, reproduction steps

**Reward Policy:**

- Bug bounty program available
- Rewarded based on severity
- Recognition in security hall of fame

### Severity Levels

**Critical:**

- Unauthenticated remote code execution
- Complete system compromise
- Unauthorized access to sensitive data

**High:**

- Authenticated remote code execution
- Data exposure
- Denial of service

**Medium:**

- Cross-site scripting
- Information disclosure
- CSRF vulnerabilities

**Low:**

- UI/UX security issues
- Minor information disclosure
- Non-critical vulnerabilities

---

**Last Updated:** June 21, 2026
**Security Team:** Amadeus / OpenClaw Team
**Version:** 1.0.0
