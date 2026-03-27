/** @jest-environment node */
// Tests for simple utility API routes: check-db-structure, reset-rate-limit, reset-user-lock

import { NextRequest } from 'next/server';

// Mock db
jest.mock('@/lib/db', () => ({ getDbClient: jest.fn() }));
import { getDbClient } from '@/lib/db';
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

const mockDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
};

function createMockRequest({
  method = 'GET',
  url = 'http://localhost:3000',
  body = undefined as any,
  headers = {} as Record<string, string>,
} = {}) {
  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================
// check-db-structure
// ============================================================
describe('GET /api/check-db-structure', () => {
  let GET: any;

  beforeAll(async () => {
    ({ GET } = await import('@/app/api/check-db-structure/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should return table structure and users', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'test' }] });

    const req = createMockRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.table_structure).toBeDefined();
    expect(data.existing_users).toBeDefined();
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));

    const req = createMockRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

// ============================================================
// reset-rate-limit
// ============================================================
describe('POST /api/reset-rate-limit', () => {
  let POST: any;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/reset-rate-limit/route'));
  });

  it('should reset rate limits successfully', async () => {
    const req = createMockRequest({ method: 'POST' });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cleared).toBe(true);
  });
});

// ============================================================
// reset-user-lock
// ============================================================
describe('POST /api/reset-user-lock', () => {
  let POST: any;

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/reset-user-lock/route'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should reset user lock status', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }],
    });

    const req = createMockRequest({ method: 'POST', body: { username: 'testuser' } });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.username).toBe('testuser');
  });

  it('should return not found when user does not exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const req = createMockRequest({ method: 'POST', body: { username: 'nonexistent' } });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.message).toContain('not found');
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));

    const req = createMockRequest({ method: 'POST', body: { username: 'testuser' } });
    const response = await POST(req);
    const data = await response.json();

    expect(data.success).toBe(false);
  });
});
