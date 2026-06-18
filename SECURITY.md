# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

- **Current Stable**: 0.1.0
- **Previous Versions**: Check `CHANGELOG.md` for security fixes

## Reporting a Vulnerability

If you find a security vulnerability in this project, please report it by creating an issue on [GitHub Issues](https://github.com/yourusername/agri-ai-agent-frontend/issues).

### What to Include

When reporting a vulnerability, please include:

1. **Project version**: The version of agri-ai-agent-frontend you're using
2. **Attack vector**: How you're able to exploit the vulnerability
3. **Reproduction steps**: Clear steps to reproduce the issue
4. **Impact**: What the vulnerability allows you to do
5. **Expected behavior**: What should happen instead

### Response Time

We aim to respond to all security reports within **48 hours**.

### Disclosure Policy

- We do not publicly disclose vulnerabilities without the reporter's permission
- After a fix is available, we'll publish a security advisory
- Disclosure timeline follows the [Python Security Policy](https://github.com/python/cpython/blob/main/SECURITY.md) model

## Security Features

This project implements comprehensive security measures:

### Authentication & Authorization
- **Session-based authentication**: Secure session tokens with HTTP-only cookies
- **CSRF protection**: All authenticated API routes require CSRF token validation
- **Progressive lockout**: Brute force protection with escalating lockout periods
- **Remember Me**: 30-day persistent login with secure token generation
- **Role-based access**: Super admin, admin, and regular user roles

### Data Protection
- **Password hashing**: bcrypt with salt for secure password storage
- **Input sanitization**: Comprehensive sanitization framework to prevent XSS and SQL injection
- **Parameterized queries**: All database operations use parameterized queries
- **Row Level Security**: PostgreSQL RLS policies enforce multi-tenant data isolation
- **Data masking**: Sensitive data (PII) is masked in logs and displays

### API Security
- **Rate limiting**: Endpoint-specific rate limiting (login: 10/min, upload: 5/min, chat: 30/min)
- **IP-based tracking**: Rate limit tracking by IP address
- **Security headers**: Comprehensive security headers via Next.js configuration
- **Session validation**: Automatic session extension 2 hours before expiry
- **Attack detection**: Password spray and brute force attack detection

### Audit Logging
- **Admin audit logs**: All admin actions are logged with IP and user agent
- **Security event logging**: Security-related events are logged
- **Detailed context**: Audit logs include JSONB context for detailed tracking

### Database Security
- **SSL/TLS**: Database connections use SSL (Neon recommended)
- **Connection pooling**: Efficient connection management
- **Transaction safety**: Proper transaction handling for data consistency

## Dependency Management

### Security-First Dependencies
This project uses well-maintained, security-focused packages:
- **Next.js**: [security advisories](https://github.com/advisories)
- **TypeScript**: [security advisories](https://github.com/advisories)
- **PostgreSQL**: [security advisories](https://github.com/advisories)
- **bcryptjs**: Strong password hashing
- **Zod**: Runtime type validation prevents injection attacks

### Dependency Scanning
- Automated dependency vulnerability scanning on every pull request
- Critical vulnerabilities block merging until resolved
- Regular dependency updates for security patches
- No deprecated dependencies (except for known stability reasons)

### Allowed Dependencies
This project uses secure, audited libraries:
- **No eval() or new Function()**: No dynamic code execution
- **No dangerous regex patterns**: No catastrophic backtracking
- **No direct filesystem access**: No unsafe file operations
- **Secure cryptography**: Uses well-vetted cryptographic libraries

## Development Security

### Code Review Process
- All code changes must be reviewed by at least one other developer
- Security-critical changes require double review
- Automated security checks run on all commits

### Security Checklist
When contributing code, ensure:
- [ ] Input validation for all user data
- [ ] XSS protection for all user-generated content
- [ ] SQL injection prevention in database queries
- [ ] Proper error handling (no sensitive data in errors)
- [ ] No hardcoded secrets (use environment variables)
- [ ] Authentication and authorization checks
- [ ] CSRF protection for forms
- [ ] Rate limiting on API endpoints
- [ ] Audit logging for sensitive operations

### Testing Security
Security is verified through:
- **Unit tests**: Validate security rules and input validation
- **Integration tests**: Verify API security and data isolation
- **Security-specific tests**: Brute force, injection, CSRF protection
- **Penetration testing**: Manual security review

## Deployment Security

### Environment Variables
All sensitive configuration must use environment variables:
- **Database URL**: Use SSL and proper connection strings
- **API Keys**: Never commit API keys to version control
- **Secrets**: Never expose in logs or error messages

### Production Checklist
- [ ] Environment variables properly configured
- [ ] Database SSL/TLS enabled
- [ ] Security headers properly configured
- [ ] Rate limiting enabled
- [ ] CSRF tokens enforced
- [ ] HTTPS only (no HTTP)
- [ ] Security middleware active
- [ ] Error handling doesn't leak sensitive data

## Browser Security

This application follows these browser security best practices:

### Content Security Policy (CSP)
- No inline scripts or styles
- Strict CSP headers in production
- Trusted script sources only

### Secure Cookies
- HttpOnly cookies for session tokens
- Secure flag for HTTPS-only transmission
- SameSite attribute for CSRF protection

### Cross-Origin Security
- Same-origin policy enforced
- Proper CORS headers for API endpoints
- No open redirects

### Data Privacy
- No PII collection without consent
- GDPR compliance considerations
- No localStorage usage for sensitive data

## Incident Response

### Detection
- Security monitoring and alerting
- Log analysis for suspicious activity
- Rate limit violations detection
- Failed authentication attempts monitoring

### Response
1. **Immediate containment**: Disable affected endpoints
2. **Investigation**: Analyze logs to understand breach
3. **Mitigation**: Apply patches and security fixes
4. **Communication**: Notify users if necessary
5. **Post-incident review**: Document lessons learned

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [React Security Best Practices](https://react.dev/learn/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

## Acknowledgments

Thanks to the security community for responsible disclosure practices.

---

**This document was generated on 2026-06-16**
