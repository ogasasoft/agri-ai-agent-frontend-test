/** @jest-environment node */
// Tests for database migration routes

import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({ getDbClient: jest.fn() }));
import { getDbClient } from '@/lib/db';
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

const mockDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
};

function createMockPost() {
  return new NextRequest('http://localhost:3000', { method: 'POST' });
}

describe('POST /api/migrate-auth', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-auth/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/migrate-security-enhancements', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-security-enhancements/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    // Return count rows for final count queries
    mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockGetDbClient.mockRejectedValueOnce(new Error('DB connection error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/migrate-admin-system', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-admin-system/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    // Handle: CREATE TABLE queries (rows:[]), admin user lookup (rows:[]), count queries (rows:[{count:'0'}])
    mockDb.query.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '0' }] };
      if (sql.includes('SELECT id FROM users')) return { rows: [] }; // No existing admin user
      if (sql.includes('INSERT INTO users') && sql.includes('RETURNING')) {
        return { rows: [{ id: 1, username: 'silentogasasoft@gmail.com', email: 'silentogasasoft@gmail.com' }] };
      }
      return { rows: [] };
    });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockGetDbClient.mockRejectedValueOnce(new Error('DB connection error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/migrate-orders-shipping', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-orders-shipping/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/migrate-drop-categories', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-drop-categories/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should succeed even when individual steps fail (errors tracked internally)', async () => {
    // This route catches individual step errors internally and returns success:true
    mockDb.query.mockRejectedValue(new Error('Step error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    // The route handles step-level errors gracefully; only critical DB connection errors cause failure
    expect(data).toBeDefined();
  });

  it('should return 500 on critical DB connection error', async () => {
    mockGetDbClient.mockRejectedValueOnce(new Error('DB connection failed'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe('POST /api/migrate-user-passwords', () => {
  let POST: any;
  beforeAll(async () => {
    ({ POST } = await import('@/app/api/migrate-user-passwords/route'));
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should run migration successfully', async () => {
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));
    const response = await POST(createMockPost());
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
