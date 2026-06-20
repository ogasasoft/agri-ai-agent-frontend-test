# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **CI/CD Enhancement**: Added Dependabot configuration for automated dependency updates
- **Docker Support**: Added Dockerfile and .dockerignore for containerized deployment
- **Code Quality Metrics**: Added GitHub Actions workflow for code climate analysis and metrics collection
- **Docker Documentation**: Added Docker usage section to README with build, run, and compose examples
- **Security Scanning**: Added security-scan.yml workflow for daily vulnerability scanning
- **Lint Staged**: Added lint-staged configuration for pre-commit code quality checks
- **Lint Staged Check**: Added lint-staged-check job to code-quality.yml workflow

### Changed
- Updated dependency management with Dependabot integration
- Enhanced CI/CD pipeline with quality metrics and analysis
- Updated lint-staged configuration with React/TypeScript support

### Security
- Dependency updates now managed automatically via Dependabot
- Daily vulnerability scanning via GitHub Actions workflow

## [Unreleased]

### Added
- TypeScript 6.0.2 upgrade
- Comprehensive GitHub Actions CI/CD pipeline
- Production-grade test suite with 199 tests
- Migrated to Next.js 16.2.7
- Enhanced README documentation
- Advanced security hardening with progressive lockout
- Multi-tenant data isolation with Row Level Security
- AI chat integration with OpenAI GPT-4o-mini
- Yamato Transport API integration (mock)
- ColorMi Shop API integration (planned)
- Tabechoku API integration (planned)
- Admin dashboard with cross-user data management
- Audit logging for all admin actions
- CSV import with Japanese header mapping
- Remember Me functionality with secure tokens
- CSRF protection on all API routes
- Rate limiting with endpoint-specific limits
- Password spray attack detection
- Security headers enforcement
- Input sanitization framework
- Audit logging for security events

### Changed
- Improved database error handling with structured responses
- Enhanced API error detection system
- Updated security utilities with comprehensive error builders
- Improved TypeScript strict mode compliance
- Updated React 18.3.0
- Updated Next.js to 16.2.7

### Fixed
- Fixed database connection pool management
- Fixed TypeScript strict mode errors
- Fixed API route dynamic rendering configuration
- Fixed multi-tenant data isolation queries
- Fixed test coverage for new features
- Fixed security header configuration
- Fixed Remember Me token validation
- Fixed rate limiting implementation

### Security
- Progressive lockout: 5min → 24hr escalation
- IP-based rate limiting for API endpoints
- CSRF token validation on all authenticated routes
- SQL injection prevention with parameterized queries
- XSS prevention with input sanitization
- Password hashing with bcrypt + salt
- Security event logging
- Audit logging for admin operations
- Secure session management
- Comprehensive security headers

### Updated Dependencies
- react: 18.3.0 → 19.2.7
- react-dom: 18.3.0 → 19.2.7
- zod: 3.24.1 → 4.4.3
- date-fns: 4.1.0 → 4.1.0
- lucide-react: 0.417.0 → 1.21.0
- @types/node: 25.0.0 → 25.9.3
- eslint: 8.57.1 → 8.57.1
- @typescript-eslint/parser: 7.18.0 → 7.18.0
- @typescript-eslint/eslint-plugin: 7.18.0 → 7.18.0

## [0.1.0] - 2024-06-15

### Added
- Initial agricultural EC management system
- Multi-tenant architecture with PostgreSQL
- Basic authentication with sessions
- Order management with CSV import
- Customer data management
- AI-powered chat consultation
- Dashboard with analytics
- Admin system with role-based access
- Yamato Transport API integration

### Changed
- Initial release
- TypeScript 6.0.3 and React 19 upgrade
- Updated dependencies (@testing-library/react 16.3.2, Jest @types/jest 30.0.0, TypeScript ESLint 8.61.1)
- Updated README with dependency upgrade information

### Security
- Session-based authentication
- Basic CSRF protection
- Password hashing

## [0.0.1] - 2024-06-14

### Added
- Initial project setup
- Basic database schema
- Login page
- Order registration page

---

**For version history and detailed changes, see [GitHub Releases](https://github.com/yourusername/agri-ai-agent-frontend/releases)**
