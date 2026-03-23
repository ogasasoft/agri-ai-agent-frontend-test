# Contributing to Agri AI Agent Frontend

Thank you for your interest in contributing. Please read these guidelines before submitting changes.

## Prerequisites

- Node.js 18+
- PostgreSQL (or a Neon account for cloud DB)
- OpenAI API key

## Setup

```bash
git clone <repo-url>
cd agri-ai-agent-frontend-test
npm install
cp .env.example .env.local   # fill in DATABASE_URL and OPENAI_API_KEY
npm run dev
```

After the dev server starts, initialize the database:

```bash
curl -X POST http://localhost:3000/api/migrate-auth
curl -X POST http://localhost:3000/api/migrate-security-enhancements
curl -X POST http://localhost:3000/api/migrate-admin-system
```

## Development Workflow

1. Create a feature branch from `main`.
2. Make your changes.
3. Run the quality gate before pushing:

```bash
npm run build        # must complete without errors
npm run typecheck    # must pass with zero TypeScript errors
npm run lint         # must pass ESLint
npm test             # all tests must pass
```

4. Open a pull request against `main`.

## Code Standards

### TypeScript

- Zero TypeScript compilation errors required.
- Avoid `any` — use proper types or `unknown` with type guards.
- All new API routes must export `export const dynamic = 'force-dynamic'` when they access `request.headers`.

### Security (mandatory for all API routes)

Every API route must follow this pattern:

```typescript
// 1. Session validation
const sessionToken =
  request.headers.get('x-session-token') || request.cookies.get('session_token')?.value;
if (!sessionToken) return unauthorized();

// 2. CSRF token validation
const csrfToken = request.headers.get('x-csrf-token');
if (csrfToken !== sessionData.session.csrf_token) return forbidden();

// 3. Input validation and sanitization
// 4. User isolation in database queries (WHERE user_id = $1)
```

### Error Handling

Use the structured error builders — simple `{ error: '...' }` responses are not acceptable:

```typescript
import { AuthErrorBuilder } from '@/lib/auth-error-details';
import { DatabaseErrorBuilder, logDatabaseOperation } from '@/lib/api-error-details';

// Auth errors
const authError = AuthErrorBuilder.sessionError('INVALID_SESSION');
return NextResponse.json(authError, { status: 401 });

// Database errors
const dbError = DatabaseErrorBuilder.queryError(query, error, { table, operation, userId });
return NextResponse.json(dbError, { status: 500 });
```

### Database

- All user-scoped queries must include `WHERE user_id = $1`.
- Use parameterized queries only — no string interpolation in SQL.
- Use `getDbClient` from `@/lib/db.ts` for all connections.
- Admin cross-user queries require explicit super admin validation.

### Logging

- No `console.log` in production code. `console.error` is acceptable for error handling.
- Use `sanitizeForLogging()` from `@/lib/security.ts` before logging any user-supplied data.

### File Creation Policy

- Prefer editing existing files over creating new ones.
- Do not create documentation files unless explicitly required by the task.

## Testing

Tests live in `__tests__/` and mirror the `src/app/api/` structure.

```bash
npm test                                      # run all tests
npm test -- __tests__/api/auth/login.test.ts  # single file
npm test -- --testNamePattern="validate"      # by test name
npm test -- --testPathPattern="admin"         # by path pattern
npm run test:coverage                         # with coverage report
```

### Test Requirements

- Every new API route needs authentication, CSRF, multi-tenant isolation, and error handling tests.
- Use `MockDbClient` from `__tests__/setup/test-utils.ts` — do not mock individual `pg` internals.
- External APIs (OpenAI, Yamato) must be mocked; tests must not make real network calls.

## Quality Checklist

Before submitting a PR, verify all 10 items in `QUALITY_CHECKLIST.md`:

| Level    | Item                                  |
| -------- | ------------------------------------- |
| CRITICAL | Build errors/warnings                 |
| CRITICAL | TypeScript compilation errors         |
| CRITICAL | Security vulnerability scan           |
| CRITICAL | Dynamic route configuration           |
| HIGH     | Debug log cleanup                     |
| HIGH     | TODO/FIXME comments                   |
| HIGH     | Function duplication                  |
| MEDIUM   | Environment variable type definitions |
| MEDIUM   | Test mock contamination               |
| LOW      | TypeScript `any` usage                |

A score below 24/30 requires fixes before the PR can be merged.

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add Tabechoku webhook endpoint
fix: correct CSRF token comparison in orders route
docs: update migration instructions in README
chore: bump TypeScript to 5.9.3
test: add multi-tenant isolation tests for admin customers API
```

## Changelog

Add an entry to `CHANGELOG.md` for every user-facing change under the `[Unreleased]` section using the Keep a Changelog format.

## Localization

- All UI strings must be in Japanese.
- Use `date-fns/locale/ja` for date formatting.
- Currency values must be formatted as Japanese Yen.

## Questions

Open an issue or start a discussion on the repository.
