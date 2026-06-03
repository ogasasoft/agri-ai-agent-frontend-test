# Security Policy

This project follows industry best practices for security. If you discover a security vulnerability, please report it to us following our guidelines.

## Supported Versions

This project maintains security updates for the following versions:

| Version | Supported          |
|---------|--------------------|
| 16.x    | ✅ Yes             |
| < 16    | ❌ Not Supported   |

## Reporting a Vulnerability

Please do NOT open a GitHub issue for security vulnerabilities. Instead:

1. **Send an encrypted email**: `security (at) ogasasoft.com`
2. **Include**: Detailed description, reproduction steps, and affected code
3. **Response time**: We aim to respond within 48 hours

## Security Best Practices

This project implements several security measures:

### Dependency Management
- Regular security audits using `npm audit`
- Automatic dependency updates via Dependabot (when configured)
- Lockfile generation and version pinning

### Authentication & Authorization
- Multi-factor authentication (MFA) support
- Password hashing with bcryptjs (blowfish)
- Remember Me token with expiration
- Rate limiting on authentication endpoints
- CSRF protection enabled
- Role-based access control (RBAC)

### Input Validation
- React Hook Form + Zod for client-side validation
- Server-side validation in API routes
- Type safety with TypeScript

### Data Protection
- Environment variables for sensitive data
- SQL injection prevention via parameterized queries (pg)
- XSS prevention via React's built-in escaping

### HTTPS & SSL
- HTTPS enforcement in production
- Secure cookies with `httpOnly` and `secure` flags
- SameSite cookie attributes

### Security Headers
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy

## Vulnerability Response Process

1. **Acknowledgment**: Confirmation within 48 hours
2. **Investigation**: Root cause analysis (1-3 business days)
3. **Fix**: Develop and test security patches
4. **Disclosure**: Public disclosure after patches are merged

## Dependabot

This project may use Dependabot for automatic dependency updates:
- Security updates: Enabled
- Regular updates: Disabled (manual reviews recommended)
- Pull Request creation: Enabled

---

For questions about this policy, please contact: `security (at) ogasasoft.com`
