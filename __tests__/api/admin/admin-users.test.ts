/** @jest-environment node */

// FILE: __tests__/api/admin/admin-users.test.ts

import { GET, POST } from '@/app/api/admin/users/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn(),
  getClientInfo: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
  isSuperAdmin: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  createErrorResponse: jest.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: false, message: msg }, { status });
  }),
}));

describe('/api/admin/users', () => {
  const { validateAdminSession } = require('@/lib/admin-auth');
  const { getDbClient } = require('@/lib/db');

  const mockDb = {
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getDbClient.mockResolvedValue(mockDb);
    mockDb.query.mockResolvedValue({ rows: [] });
    mockDb.end.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // GET /api/admin/users
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/users', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is invalid', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'invalid-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
        // No x-csrf-token header
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return a list of users on success', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          created_at: '2024-01-01T00:00:00Z',
          last_login: null,
          role: 'super_admin',
          is_admin: true,
          is_super_admin: true,
          failed_login_attempts: 0,
          account_locked_until: null,
          is_active: true,
        },
        {
          id: 2,
          username: 'user1',
          email: 'user1@example.com',
          created_at: '2024-01-02T00:00:00Z',
          last_login: null,
          role: 'user',
          is_admin: false,
          is_super_admin: false,
          failed_login_attempts: 0,
          account_locked_until: null,
          is_active: true,
        },
      ];

      mockDb.query.mockResolvedValue({ rows: mockUsers });

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].username).toBe('admin');
    });

    it('should return empty users array when no users exist', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('DB connection failed'));

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even on database error', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('DB error'));

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
      });

      await GET(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should accept session token from cookie', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-session-token' },
        headers: { 'x-csrf-token': 'valid-csrf-token' },
      });

      const response = await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/users
  // ---------------------------------------------------------------------------

  describe('POST /api/admin/users', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is invalid (null)', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'invalid-session' },
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not super admin', async () => {
      // is_super_admin: false means adminUser.is_super_admin is falsy
      const nonSuperAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(nonSuperAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'admin-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session' },
        // No CSRF token
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when required fields are missing (no email)', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { username: 'newuser', password: 'pass123' }, // missing email
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when required fields are missing (no username)', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', password: 'pass123' }, // missing username
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when required fields are missing (no password)', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser' }, // missing password
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'not-an-email', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for another invalid email format (missing TLD)', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'user@domain', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when password is shorter than 6 characters', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser', password: 'abc' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when email or username already exists', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      // First query: existing user check returns a match
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'existing@example.com', username: 'existinguser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should create a new user successfully', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const newUserRow = {
        id: 10,
        username: 'newuser',
        email: 'new@example.com',
        created_at: '2024-01-01T00:00:00Z',
        is_admin: false,
        is_super_admin: false,
      };

      // Call 1: existing user check → no match
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      // Call 2: INSERT INTO users → returns new user
      mockDb.query.mockResolvedValueOnce({ rows: [newUserRow] });
      // Call 3: INSERT INTO user_passwords
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      // Call 4: INSERT INTO admin_audit_logs
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123', isAdmin: false },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.username).toBe('newuser');
      expect(data.user.email).toBe('new@example.com');
      expect(data.message).toBe('ユーザーが正常に作成されました');
    });

    it('should hash the password with bcrypt before storing', async () => {
      const bcrypt = require('bcryptjs');
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const newUserRow = {
        id: 11,
        username: 'hashtest',
        email: 'hash@example.com',
        created_at: '2024-01-01T00:00:00Z',
        is_admin: false,
        is_super_admin: false,
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })        // existing user check
        .mockResolvedValueOnce({ rows: [newUserRow] }) // INSERT user
        .mockResolvedValueOnce({ rows: [] })         // INSERT user_passwords
        .mockResolvedValueOnce({ rows: [] });         // INSERT audit log

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'hash@example.com', username: 'hashtest', password: 'securepass' },
      });

      await POST(request);

      expect(bcrypt.hash).toHaveBeenCalledWith('securepass', 12);
    });

    it('should return 500 on database error during user creation', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      // existing user check passes, then INSERT fails
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB insert failed'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even when POST creation fails', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB error'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'new@example.com', username: 'newuser', password: 'pass123' },
      });

      await POST(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should create admin user when isAdmin is true', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const newAdminRow = {
        id: 12,
        username: 'newadmin',
        email: 'newadmin@example.com',
        created_at: '2024-01-01T00:00:00Z',
        is_admin: true,
        is_super_admin: false,
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [newAdminRow] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { email: 'newadmin@example.com', username: 'newadmin', password: 'adminpass', isAdmin: true },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.is_admin).toBe(true);
    });
  });
});
