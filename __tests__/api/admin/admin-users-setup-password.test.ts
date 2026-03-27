/** @jest-environment node */

// FILE: __tests__/api/admin/admin-users-setup-password.test.ts

import { POST } from '@/app/api/admin/users/setup-password/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-new-password'),
}));

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

describe('/api/admin/users/setup-password', () => {
  const { validateAdminSession } = require('@/lib/admin-auth');
  const { getDbClient } = require('@/lib/db');
  const bcrypt = require('bcryptjs');

  const mockDb = {
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getDbClient.mockResolvedValue(mockDb);
    mockDb.query.mockResolvedValue({ rows: [] });
    mockDb.end.mockResolvedValue(undefined);
    // Default: initial password "1995" is valid
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed-new-password');
  });

  // ---------------------------------------------------------------------------
  // POST /api/admin/users/setup-password
  // ---------------------------------------------------------------------------

  describe('POST /api/admin/users/setup-password', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { customerEmail: 'customer@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when neither header nor cookie contains a session token', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/users/setup-password',
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
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
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session' },
        // No x-csrf-token
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerEmail is missing', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { password: 'newpass123' }, // no customerEmail
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com' }, // no password
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when email format is invalid', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'not-an-email', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when email is missing TLD (e.g. "user@domain")', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'user@domain', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when password is shorter than 6 characters', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: '12345' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when the customer email is not found in users table', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      // SELECT returns no matching user
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'nonexistent@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when the current password is not "1995"', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'some-hash',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [existingUser] });

      // bcrypt.compare returns false (current password is NOT "1995")
      bcrypt.compare.mockResolvedValueOnce(false);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should successfully update the customer password when all conditions are met', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'customer@example.com',
        email: 'customer@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] }) // SELECT user
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users (password_hash)
        .mockResolvedValueOnce({ rows: [] }) // UPDATE user_passwords
        .mockResolvedValueOnce({ rows: [] }); // INSERT audit log

      bcrypt.compare.mockResolvedValueOnce(true); // "1995" matches

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
        body: { customerEmail: 'customer@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('お客様のパスワードが正常に設定されました');
      expect(data.user.id).toBe(10);
      expect(data.user.email).toBe('customer@example.com');
    });

    it('should hash the new password with bcrypt before storing', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValue({ rows: [] });

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'mynewpass' },
      });

      await POST(request);

      expect(bcrypt.hash).toHaveBeenCalledWith('mynewpass', 12);
    });

    it('should verify the current password "1995" using bcrypt.compare', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'some-bcrypt-hash',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValue({ rows: [] });

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'mynewpass' },
      });

      await POST(request);

      expect(bcrypt.compare).toHaveBeenCalledWith('1995', existingUser.password_hash);
    });

    it('should update user_passwords table with the plain text password', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users
        .mockResolvedValueOnce({ rows: [] }) // UPDATE user_passwords
        .mockResolvedValueOnce({ rows: [] }); // audit log

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'mynewpass' },
      });

      await POST(request);

      const calls = mockDb.query.mock.calls;
      const userPasswordCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('user_passwords')
      );

      expect(userPasswordCall).toBeDefined();
      // The plain text password should be passed as a parameter
      expect(userPasswordCall[1]).toContain('mynewpass');
    });

    it('should insert a SETUP_CUSTOMER_PASSWORD audit log entry', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users
        .mockResolvedValueOnce({ rows: [] }) // UPDATE user_passwords
        .mockResolvedValueOnce({ rows: [] }); // audit log

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'mynewpass' },
      });

      await POST(request);

      const calls = mockDb.query.mock.calls;
      const auditCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('admin_audit_logs')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall[1]).toContain('SETUP_CUSTOMER_PASSWORD');
    });

    it('should return 500 on database error during SELECT', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockRejectedValueOnce(new Error('DB connection lost'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return 500 on database error during UPDATE', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] }) // SELECT
        .mockRejectedValueOnce(new Error('UPDATE failed')); // UPDATE users fails

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even when a database error occurs', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockRejectedValue(new Error('DB error'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      await POST(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should call client.end() after a successful password setup', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValue({ rows: [] });

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      await POST(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should accept session token from cookie when header is absent', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValue({ rows: [] });

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'cookie-session-token' },
        headers: { 'x-csrf-token': 'valid-csrf' },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      const response = await POST(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });

    it('should reset failed_login_attempts and unlock account on password update', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'c@example.com',
        email: 'c@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users
        .mockResolvedValueOnce({ rows: [] }) // UPDATE user_passwords
        .mockResolvedValueOnce({ rows: [] }); // audit log

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'c@example.com', password: 'newpass123' },
      });

      await POST(request);

      const calls = mockDb.query.mock.calls;
      const updateCall = calls.find(
        (c: any[]) =>
          typeof c[0] === 'string' &&
          c[0].includes('UPDATE users') &&
          c[0].includes('failed_login_attempts')
      );

      expect(updateCall).toBeDefined();
      // The UPDATE should reset failed_login_attempts to 0
      const sql = updateCall[0] as string;
      expect(sql).toContain('failed_login_attempts = 0');
    });

    it('should return the user id, username, and email in the response', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const existingUser = {
        id: 10,
        username: 'customer@example.com',
        email: 'customer@example.com',
        password_hash: 'hashed-1995',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingUser] })
        .mockResolvedValue({ rows: [] });

      bcrypt.compare.mockResolvedValueOnce(true);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerEmail: 'customer@example.com', password: 'mynewpass' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user).toMatchObject({
        id: 10,
        username: 'customer@example.com',
        email: 'customer@example.com',
      });
    });
  });
});
