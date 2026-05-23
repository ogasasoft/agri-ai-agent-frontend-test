# Security Policy

## Supported Versions

We currently maintain active security support for:
- Version 0.1.0 and later

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT raise a GitHub issue. Instead:

1. **Email us** at security@example.com
2. Include a detailed description of the vulnerability
3. Describe any PoC (Proof of Concept) if available
4. Let us know how we can reproduce the issue

We will respond within 48 hours.

## Security Practices

### Dependency Management

- **Automated Security Audits**: We run daily security scans via GitHub Actions
- **Dependency Updates**: We regularly update all dependencies to the latest secure versions
- **Lock Files**: We use `package-lock.json` to ensure reproducible builds

### Pre-commit Checks

All commits run automated security checks:
- .env files are never committed (enforced by git hooks)
- Potential API keys are flagged
- Security vulnerabilities are detected before merging

### CI/CD Security

Our CI/CD pipeline includes:
- npm audit checks
- Snyk security scanning
- Dependency outdated checks
- Pre-commit security validation

## Security Checklist

When contributing to this project, ensure:

- [ ] No `.env` files are committed
- [ ] No secrets are hardcoded in source code
- [ ] Dependencies are up to date
- [ ] Tests pass
- [ ] Code follows security best practices
- [ ] Input validation is performed
- [ ] No unsafe JSON parsing (use zod/validator)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication and authorization are properly implemented

## Common Vulnerabilities

### Cross-Site Scripting (XSS)
**Prevention:**
- Use `zod` for input validation
- Use `dangerouslySetInnerHTML` only with sanitized content
- Use React's built-in escaping
- Implement Content Security Policy (CSP)

### SQL Injection
**Prevention:**
- Always use parameterized queries
- Never concatenate user input into SQL strings
- Use ORM or query builders that prevent injection

### Broken Access Control
**Prevention:**
- Implement role-based access control
- Verify permissions on every protected route
- Use middleware for authentication checks

### Dependency Vulnerabilities
**Prevention:**
- Run `npm audit` regularly
- Update dependencies with security fixes
- Use `npm ci` in CI/CD
- Monitor security advisories

## Security Tools

- **npm audit**: Checks for vulnerable dependencies
- **Snyk**: Advanced security scanning
- **ESLint Security Plugin**: Detects common security issues
- **Prettier**: Ensures consistent code formatting

## Getting Help

For security-related questions or concerns:
- Email: security@example.com
- GitHub Issues (non-vulnerability): For general security questions

## Incident Response

If a vulnerability is disclosed:
1. We will investigate immediately
2. We will patch the vulnerability
3. We will create a security advisory
4. We will coordinate disclosure with affected users
5. We will review and update our security practices
