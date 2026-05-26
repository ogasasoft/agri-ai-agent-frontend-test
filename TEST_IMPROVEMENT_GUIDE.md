# Test Improvement Guide

## Current Status

**Last Test Run:** 2026-05-26 09:29 (JST)

```
Test Suites: 11 failed, 8 passed, 19 total
Tests:       55 failed, 3 skipped, 160 passed, 218 total
```

### Passing Tests (160 tests)
- Homepage component
- Customers page component
- Error test helpers
- Error builder
- Categories API tests
- AI chat API tests
- Auth logout tests

### Failing Tests (55 tests)
All failing tests are in the following categories:

#### 1. Auth Tests (18 failing)
- `__tests__/api/auth/login-enhanced.test.ts` - POST /api/auth/login
  - 5 tests: valid credentials, remember me, cookies, password change
- `__tests__/api/auth/me.test.ts` - GET /api/admin/me
  - 1 test: expired session

#### 2. Admin Dashboard Tests (6 failing)
- `__tests__/api/admin/dashboard-stats.test.ts` - GET /api/admin/dashboard/stats
  - 3 tests: date query, stats calculation, error handling

#### 3. Admin Customer Tests (15 failing)
- `__tests__/api/admin/admin-customers.test.ts` - GET /api/admin/customers
  - 15 tests: basic CRUD, search, filtering, sorting

#### 4. Shipping Tests (6 failing)
- `__tests__/api/shipping/shipping.test.ts` - POST /api/shipping
  - 3 tests: basic shipping, validation, error handling
- `__tests__/api/shipping/yamato-settings.test.ts` - GET /api/yamato-settings
  - 3 tests: settings retrieval, defaults, cache

#### 5. AI Chat Tests (10 failing)
- `__tests__/api/ai/chat.test.ts` - POST /api/chat
  - 10 tests: conversation handling, responses, errors

## Test Categories

### 🟢 Database-Free Tests (Stable)
These tests pass without a running database:

- UI Component Tests
  - `src/app/page.test.tsx` - Homepage
  - `src/app/admin/customers/page.test.tsx` - Customers page
- Utility Tests
  - `__tests__/utils/error-test-helpers.test.ts`
  - `__tests__/error-handling/error-builder.test.ts`
- Mock API Tests
  - `__tests__/api/auth/me.test.ts` - Auth status check
  - `__tests__/api/auth/logout.test.ts` - Logout functionality

### 🔴 Database-Dependent Tests (Unstable)
These tests require a live PostgreSQL connection:

- Authentication Tests
  - `__tests__/api/auth/login.test.ts`
  - `__tests__/api/auth/login-enhanced.test.ts`
- Admin Tests
  - `__tests__/api/admin/dashboard-stats.test.ts`
  - `__tests__/api/admin/admin-customers.test.ts`
- Order & Shipping Tests
  - `__tests__/api/orders/*` (if exists)
  - `__tests__/api/shipping/*`
- Category & AI Tests
  - `__tests__/api/categories/categories.test.ts`
  - `__tests__/api/ai/chat.test.ts`

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testPathPattern="api/auth/login.test.ts"

# Run with coverage
npm test -- --coverage

# Run with watch mode
npm test -- --watch

# Run tests with database
npm run test:db
```

### Database Setup

```bash
# Setup test database
npm run test:setup

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (if needed)
brew services start postgresql@14
# or
docker run -d --name postgres-agri -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:14
```

## Common Test Failures

### 1. 500 Error on POST /api/auth/login
**Symptom:** Test expects 200, receives 500
**Likely Causes:**
- Database connection issue
- Missing user in test database
- Query parameter error
- SQL injection in query construction

**Troubleshooting:**
```typescript
// Check route implementation
src/app/api/auth/login/route.ts

// Verify test database has test user
INSERT INTO users (id, email, password_hash, role) VALUES (1, 'test@example.com', '$2a$10$...', 'customer');
```

### 2. 401 Unauthorized on GET /api/admin/me
**Symptom:** Test expects 200, receives 401
**Likely Causes:**
- Cookie not being set properly
- Session ID validation failing
- Session expired
- Missing authentication middleware

**Troubleshooting:**
```typescript
// Check cookie format
headers: {
  'Cookie': 'session=abc123; HttpOnly; Secure; Path=/'
}

// Verify session exists in database
SELECT * FROM sessions WHERE session_id = 'abc123';
```

### 3. ECONNREFUSED or Database Connection Error
**Symptom:** Tests fail to connect to PostgreSQL
**Likely Causes:**
- PostgreSQL not running
- Wrong DATABASE_URL
- Database does not exist

**Troubleshooting:**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Create test database
createdb $DATABASE_URL

# Verify setup
npm run test:setup
```

## Test Improvement Priorities

### High Priority
1. **Fix Auth Login Tests** (18 tests)
   - Most critical user-facing feature
   - Quick wins possible with proper test data

2. **Fix Admin Customer Tests** (15 tests)
   - High value for admin workflows
   - Common CRUD operations

### Medium Priority
3. **Fix Shipping Tests** (6 tests)
   - Important for e-commerce
   - Can use mocking for external APIs

4. **Fix Admin Dashboard Tests** (6 tests)
   - Analytics and reporting
   - Date query logic

### Low Priority
5. **Fix AI Chat Tests** (10 tests)
   - External API dependency
   - Can be mocked more easily

### All Categories
6. **Improve Test Coverage**
   - Add missing test cases
   - Test error paths more thoroughly

## Best Practices

### Test Data Management
- Use transactions and rollback for test isolation
- Create fixtures in `__tests__/fixtures/`
- Clean up after each test

### Mocking Strategy
- Mock external APIs (Yamato, OpenAI, etc.)
- Use in-memory database for tests
- Keep mocks minimal and focused

### Test Organization
- Group related tests in single files
- Use descriptive test names
- Keep tests independent (no shared state)

## Reference Links

- Jest Documentation: https://jestjs.io/docs/getting-started
- Next.js API Routes: https://nextjs.org/docs/api-routes/introduction
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- PostgreSQL Testing: https://node-postgres.com/test/transactions
