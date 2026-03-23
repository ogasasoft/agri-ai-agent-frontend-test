# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-24

### Added

#### Core Features

- EC order management with multi-platform integration (ColorMi, Tabechoku)
- AI-powered chat consultation using OpenAI GPT-4o-mini
- Dashboard analytics with revenue and order growth metrics
- Customer management with cross-order aggregation

#### Authentication & Security

- Session-based authentication with CSRF protection
- Progressive lockout system (5min → 15min → 30min → 1hr → 2hr → 4hr → 8hr → 24hr)
- Remember Me persistent login with selector/validator token pattern (30-day)
- Rate limiting per endpoint (Login: 10/min, Upload: 5/min, Chat: 30/min)
- Attack detection for password spray, account enumeration, and brute force
- Comprehensive security headers via `next.config.js` and `src/lib/security.ts`

#### Admin System

- Role-based access control (User / Admin / Super Admin)
- Admin dashboard with system statistics and activity monitoring
- Cross-user customer data management
- External API integration settings (ColorMi, Tabechoku)
- Audit logging for all admin actions

#### Shipping Workflow

- Yamato Transport API integration with CSV export
- Three-step shipping flow: Settings → Confirmation → Completion
- Multi-select bulk operations for batch label creation
- Auto-download of shipping CSV on completion

#### Database

- PostgreSQL with Neon connection pooling
- Row Level Security (RLS) for multi-tenant data isolation
- Schema tables: sessions, remember_tokens, rate_limits, security_events, admin_audit_logs
- Migration endpoints for incremental schema setup

#### Developer Experience

- TDD test suite with 140+ test cases (Jest + Next.js)
- TypeScript strict mode with zero-error enforcement
- ESLint with custom rules and lint-staged integration
- Quality checklist (`QUALITY_CHECKLIST.md`) with 10-item inspection and score system
- AI-driven error detection system (`AuthErrorBuilder`, `DatabaseErrorBuilder`)
- VSCode snippets for error handler boilerplate

#### Localization

- Full Japanese UI with agricultural terminology
- Japanese locale date formatting (`date-fns/locale/ja`)
- Japanese Yen currency formatting
- CSV import with Japanese column headers (注文番号, 顧客名, etc.)

### Technical Notes

- Next.js 14 App Router
- TypeScript 5.9.3 (pinned for eslint-config-next compatibility)
- Node.js environment for API route tests
- IndexedDB + BroadcastChannel for cross-tab chat persistence
