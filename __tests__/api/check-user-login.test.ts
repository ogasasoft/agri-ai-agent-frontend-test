/** @jest-environment node */
// Tests for check-user-login, create-test-users, delete-test-users routes

import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({ getDbClient: jest.fn() }));
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

import { getDbClient } from '@/lib/db';
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

const mockDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
};

function createMockRequest(body: any = {}, method = 'POST') {
  return new NextRequest('http://localhost:3000', {
    method,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

// ============================================================
// check-user-login
// ============================================================
describe('POST /api/check-user-login', () => {
  let POST: any;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/check-user-login/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
  });

  it('should return not found when user does not exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const req = createMockRequest({ username: 'nonexistent', password: 'pass' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.found).toBe(false);
  });

  it('should return user info and password check when user exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true,
          locked_until: null,
          failed_login_attempts: 0,
          password_hash: '$2b$12$hashedpassword',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ plain_password: 'test123' }] });

    const req = createMockRequest({ username: 'testuser', password: 'test123' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.found).toBe(true);
    expect(data.user.username).toBe('testuser');
    expect(data.password_check).toBeDefined();
    expect(data.password_check.bcrypt_hash_match).toBe(true);
  });

  it('should handle missing plain password gracefully', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true,
          locked_until: null,
          failed_login_attempts: 0,
          password_hash: '$2b$12$hashedpassword',
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // No plain password

    const req = createMockRequest({ username: 'testuser', password: 'test123' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.password_check.stored_plain_password).toBe('Not found');
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));

    const req = createMockRequest({ username: 'testuser', password: 'test123' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(response.status).toBe(500);
  });
});

// ============================================================
// create-test-users (dev only)
// ============================================================
describe('POST /api/create-test-users', () => {
  let POST: any;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/create-test-users/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    // Return empty rows for existing user checks, then a created user row
    mockDb.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('username')) {
        return { rows: [] }; // User doesn't exist
      }
      if (sql.includes('INSERT INTO users')) {
        return { rows: [{ id: 1 }] };
      }
      return { rows: [] };
    });
  });

  it('should return 404 in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('should create test users in development environment', async () => {
    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should handle database errors', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));

    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
  });
});

// ============================================================
// delete-test-users (dev only)
// ============================================================
describe('POST /api/delete-test-users', () => {
  let POST: any;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/delete-test-users/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('should return 404 in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('should delete test users in development environment', async () => {
    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('should handle database errors', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));

    const req = createMockRequest({});
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
  });
});
