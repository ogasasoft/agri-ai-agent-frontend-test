/** @jest-environment node */

// FILE: __tests__/api/admin/admin-customers-bulk-delete.test.ts

import { POST } from '@/app/api/admin/customers/bulk-delete/route';
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
  addSecurityHeaders: jest.fn().mockImplementation((response: Response) => response),
}));

describe('/api/admin/customers/bulk-delete', () => {
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
  // POST /api/admin/customers/bulk-delete
  // ---------------------------------------------------------------------------

  describe('POST /api/admin/customers/bulk-delete', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: { customerIds: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when neither header nor cookie contains session token', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/customers/bulk-delete',
        body: { customerIds: [1] },
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
        body: { customerIds: [1, 2] },
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
        body: { customerIds: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerIds is missing from body', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: {}, // no customerIds
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerIds is an empty array', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerIds is not an array', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: 'not-an-array' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerIds contains non-numeric values', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [1, 'invalid', 3] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when none of the specified customers exist', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      // SELECT check returns no rows
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [999, 998] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should successfully bulk delete existing customers', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, email: 'user1@example.com' },
            { id: 2, email: 'user2@example.com' },
          ],
        }) // SELECT existing customers
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        // Customer 1 deletions
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // DELETE users (customer 1)
        // Customer 2 deletions
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // DELETE users (customer 2)
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // INSERT INTO admin_audit_logs

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
        body: { customerIds: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);
      expect(data.message).toContain('2人の顧客が正常に削除されました');
    });

    it('should report not-found IDs when some customers do not exist', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      // Only customer 1 exists; customer 999 does not
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'user1@example.com' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-admin-session',
          'x-csrf-token': 'valid-csrf-token',
        },
        body: { customerIds: [1, 999] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notFoundCount).toBe(1);
      expect(data.notFoundIds).toContain(999);
    });

    it('should ROLLBACK the transaction when an error occurs during deletion', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'user1@example.com' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('FK violation')); // DELETE orders fails

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      const sqlCalls = mockDb.query.mock.calls.map((c: any[]) => c[0] as string);
      expect(sqlCalls.some((s) => s === 'ROLLBACK')).toBe(true);
    });

    it('should return 500 on database error during the initial SELECT', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockRejectedValueOnce(new Error('DB connection failed'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [1, 2] },
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
        body: { customerIds: [1] },
      });

      await POST(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should call client.end() after a successful bulk delete', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'u@example.com' }] })
        .mockResolvedValue({ rowCount: 1, rows: [] }); // all subsequent calls

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [1] },
      });

      await POST(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should insert an audit log entry with BULK_DELETE_CUSTOMERS action', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'u@example.com' }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [1] },
      });

      await POST(request);

      const calls = mockDb.query.mock.calls;
      const auditCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('admin_audit_logs')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall[1]).toContain('BULK_DELETE_CUSTOMERS');
    });

    it('should accept session token from cookie when header is absent', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 3, email: 'c@example.com' }] })
        .mockResolvedValue({ rowCount: 1, rows: [] });

      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'cookie-session-token' },
        headers: { 'x-csrf-token': 'valid-csrf' },
        body: { customerIds: [3] },
      });

      const response = await POST(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });

    it('should handle a single valid customer deletion correctly', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 42, email: 'single@example.com' }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'valid-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { customerIds: [42] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(1);
      expect(data.notFoundCount).toBe(0);
    });
  });
});
