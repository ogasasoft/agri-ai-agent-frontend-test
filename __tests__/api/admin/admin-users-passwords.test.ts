/** @jest-environment node */

// FILE: __tests__/api/admin/admin-users-passwords.test.ts

import { GET } from '@/app/api/admin/users/passwords/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn().mockResolvedValue(undefined),
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

describe('/api/admin/users/passwords', () => {
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
  // GET /api/admin/users/passwords
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/users/passwords', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when neither header nor cookie contains a session token', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/admin/users/passwords',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is invalid (null)', async () => {
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

    it('should return 403 when user is not a super admin', async () => {
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'admin-session',
          'x-csrf-token': 'valid-csrf',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-session' },
        // No x-csrf-token
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return users list with password info on success', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const mockUsers = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          password: 'adminpass',
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
          password: '生成済み',
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

      // First call: SELECT users with passwords; second call: INSERT audit log
      mockDb.query
        .mockResolvedValueOnce({ rows: mockUsers })
        .mockResolvedValueOnce({ rows: [] });

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
      expect(data.users[1].username).toBe('user1');
    });

    it('should return an empty users array when no users exist', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // audit log

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

    it('should return 500 on database error during SELECT', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockRejectedValueOnce(new Error('DB connection lost'));

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even when a database error occurs', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockRejectedValue(new Error('DB error'));

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
      });

      await GET(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should call client.end() after a successful response', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
      });

      await GET(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should accept session token from cookie when header is absent', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-session-token' },
        headers: { 'x-csrf-token': 'valid-csrf' },
      });

      const response = await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });

    it('should insert a VIEW_USER_PASSWORDS audit log entry', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const mockUsers = [{ id: 1, username: 'admin' }];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockUsers }) // SELECT users
        .mockResolvedValueOnce({ rows: [] }); // INSERT audit log

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
      });

      await GET(request);

      const calls = mockDb.query.mock.calls;
      const auditCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('admin_audit_logs')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall[1]).toContain('VIEW_USER_PASSWORDS');
    });

    it('should call validateAdminSession with the correct session token', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValue({ rows: [] });

      const sessionToken = 'specific-token-value';
      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': sessionToken,
          'x-csrf-token': 'valid-csrf',
        },
      });

      await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith(sessionToken);
      expect(validateAdminSession).toHaveBeenCalledTimes(1);
    });

    it('should prioritize header session token over cookie session token', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValue({ rows: [] });

      const headerToken = 'header-token';
      const cookieToken = 'cookie-token';

      const request = createMockRequest({
        method: 'GET',
        headers: {
          'x-session-token': headerToken,
          'x-csrf-token': 'valid-csrf',
        },
        cookies: { session_token: cookieToken },
      });

      await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith(headerToken);
      expect(validateAdminSession).not.toHaveBeenCalledWith(cookieToken);
    });
  });
});
