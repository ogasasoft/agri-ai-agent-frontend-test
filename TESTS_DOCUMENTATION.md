# Test Documentation

## Test Environment Setup

### Database-Dependent Tests
Most API tests require a live PostgreSQL database connection. These tests are marked with `(requires DB)` when applicable.

**Tests requiring DB:**
- `/api/auth/login` (login route)
- `/api/auth/me` (auth me route)
- `/api/auth/logout` (logout route)
- `/api/admin/*` (admin endpoints)
- `/api/orders/*` (order endpoints)
- `/api/shipping/*` (shipping endpoints)
- `/api/categories/*` (category endpoints)
- `/api/ai/chat` (AI chat endpoint)

**Tests that pass with mock only:**
- `/api/auth/me.test.ts` (GET /api/auth/me - passes with mock)
- `/api/auth/logout.test.ts` (POST /api/auth/logout - passes with mock)
- `src/app/page.test.tsx` (homepage component)
- `src/app/admin/customers/page.test.tsx` (customers page component)
- `__tests__/utils/error-test-helpers.test.ts` (error test helpers)
- `__tests__/error-handling/error-builder.test.ts` (error builder)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern="api/auth/login.test.ts"

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- --testNamePattern="should return user info"
```

## Test Status Summary

- **Total Test Suites:** 19
- **Passing Test Suites:** 5 (homepage, customers page, error helpers, error builder, logout)
- **Failing Test Suites:** 14 (all DB-dependent API tests)
- **Total Tests:** 209
- **Passed:** 95
- **Failed:** 111
- **Skipped:** 3

## Recent Fixes

### 2026-05-23
- Fixed logout route TypeScript errors (use headers.set() with individual cookie strings)
- Added skip for me.test.ts expired sessions test (requires DB)
- Fixed 38 tests in error-test-helpers.test.ts
- Fixed homepage test (added render import)

### Test Stability Notes
- Tests that don't require DB connection are stable and pass consistently
- DB-dependent tests require a running PostgreSQL instance
- Mock tests cover core authentication and UI components

## Troubleshooting

### Tests fail with "ECONNREFUSED"
- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check DATABASE_URL in .env.local

### Tests fail with "Cannot find module"
- Run: `npm install`
- Clear cache: `npm test -- --clearCache`

### Tests show type errors
- Run: `npm run typecheck`
- Run: `npm run lint`
