/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/create-customer/route';

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
}));
jest.mock('@/lib/security', () => ({
  createErrorResponse: jest.fn().mockImplementation((msg: string, status: number) =>
    new Response(JSON.stringify({ success: false, message: msg }), { status })
  ),
}));
jest.mock('@/lib/db', () => ({ getDbClient: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('$2b$12$hashed') }));

import { validateAdminSession } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';

const mockValidateAdmin = validateAdminSession as jest.MockedFunction<typeof validateAdminSession>;
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

const mockDb = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  end: jest.fn().mockResolvedValue(undefined),
};

const mockAdmin = { id: 1, username: 'admin', is_super_admin: true };

function createReq(body: any, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/admin/users/create-customer', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json', ...headers }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/users/create-customer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateAdmin.mockResolvedValue(mockAdmin as any);
    mockGetDbClient.mockResolvedValue(mockDb as any);
    mockDb.query.mockResolvedValue({ rows: [] });
  });

  it('should return 401 when session token is missing', async () => {
    mockValidateAdmin.mockResolvedValue(null as any);
    const req = createReq({ customerEmail: 'test@example.com' });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should return 403 when not admin', async () => {
    mockValidateAdmin.mockResolvedValue(null as any);
    const req = createReq({ customerEmail: 'test@example.com' }, { 'x-session-token': 'token' });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('should return 403 when CSRF token missing', async () => {
    const req = createReq({ customerEmail: 'test@example.com' }, { 'x-session-token': 'token' });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('should return 400 when customerEmail is missing', async () => {
    const req = createReq({}, { 'x-session-token': 'token', 'x-csrf-token': 'csrf' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 when email format is invalid', async () => {
    const req = createReq(
      { customerEmail: 'not-an-email' },
      { 'x-session-token': 'token', 'x-csrf-token': 'csrf' }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 when email already exists', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 99, username: 'existing' }] });
    const req = createReq(
      { customerEmail: 'existing@example.com' },
      { 'x-session-token': 'token', 'x-csrf-token': 'csrf' }
    );
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should create customer successfully', async () => {
    // Check existing → empty; INSERT user → new user; INSERT passwords; INSERT audit_logs
    mockDb.query
      .mockResolvedValueOnce({ rows: [] }) // No existing user
      .mockResolvedValueOnce({ rows: [{ id: 5, username: 'new@example.com', email: 'new@example.com', created_at: new Date().toISOString() }] }) // INSERT user
      .mockResolvedValueOnce({ rows: [] }) // INSERT user_passwords
      .mockResolvedValueOnce({ rows: [] }); // INSERT audit_logs

    const req = createReq(
      { customerEmail: 'new@example.com' },
      { 'x-session-token': 'token', 'x-csrf-token': 'csrf' }
    );
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('new@example.com');
    expect(data.user.initial_password).toBe('1995');
  });

  it('should return 500 on database error', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));
    const req = createReq(
      { customerEmail: 'new@example.com' },
      { 'x-session-token': 'token', 'x-csrf-token': 'csrf' }
    );
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
