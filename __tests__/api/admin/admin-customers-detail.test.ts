/** @jest-environment node */

// FILE: __tests__/api/admin/admin-customers-detail.test.ts

import { DELETE } from '@/app/api/admin/customers/[customerId]/route';
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

describe('/api/admin/customers/[customerId]', () => {
  const { validateAdminSession } = require('@/lib/admin-auth');
  const { getDbClient } = require('@/lib/db');

  const mockDb = {
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  function buildParams(customerId: string) {
    return { params: { customerId } };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getDbClient.mockResolvedValue(mockDb);
    mockDb.query.mockResolvedValue({ rows: [] });
    mockDb.end.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/admin/customers/[customerId]
  // ---------------------------------------------------------------------------

  describe('DELETE /api/admin/customers/[customerId]', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'DELETE' });

      const response = await DELETE(request, buildParams('1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 401 when neither header nor cookie session token is provided', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/admin/customers/1',
      });

      const response = await DELETE(request, buildParams('1'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should accept session token from cookie when header is absent', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      // Customer exists
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 5, email: 'cust@example.com' }] }) // SELECT check
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'DELETE',
        cookies: { session_token: 'cookie-session-token' },
      });

      const response = await DELETE(request, buildParams('5'));

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });

    it('should return 403 when admin session is invalid (null)', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'invalid-session' },
      });

      const response = await DELETE(request, buildParams('1'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerId is not a number', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-session' },
      });

      const response = await DELETE(request, buildParams('not-a-number'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customerId is "abc"', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-session' },
      });

      const response = await DELETE(request, buildParams('abc'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when customer does not exist', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      // SELECT returns empty rows (customer not found or inactive)
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-session' },
      });

      const response = await DELETE(request, buildParams('999'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should successfully delete a customer and related data', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 10, email: 'customer@example.com' }] }) // SELECT check
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM remember_tokens
        .mockResolvedValueOnce({ rows: [] }) // DELETE FROM users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // INSERT INTO admin_audit_logs

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await DELETE(request, buildParams('10'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('顧客が正常に削除されました。');
    });

    it('should delete related orders, categories, sessions, and remember_tokens before deleting the user', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 10, email: 'customer@example.com' }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      await DELETE(request, buildParams('10'));

      const calls = mockDb.query.mock.calls;
      const sqlCalls = calls.map((c: any[]) => c[0] as string);

      expect(sqlCalls.some((s) => s.includes('DELETE FROM orders'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('DELETE FROM categories'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('DELETE FROM sessions'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('DELETE FROM remember_tokens'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('DELETE FROM users'))).toBe(true);
    });

    it('should log the DELETE_CUSTOMER action to admin_audit_logs', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 10, email: 'customer@example.com' }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE orders
        .mockResolvedValueOnce({ rows: [] }) // DELETE categories
        .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [] }) // DELETE remember_tokens
        .mockResolvedValueOnce({ rows: [] }) // DELETE users
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [] }); // audit log INSERT

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      await DELETE(request, buildParams('10'));

      const calls = mockDb.query.mock.calls;
      const auditCall = calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('admin_audit_logs')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall[1]).toContain('DELETE_CUSTOMER');
    });

    it('should ROLLBACK the transaction when delete operation fails mid-way', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 10, email: 'customer@example.com' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('FK constraint violation')); // DELETE orders fails

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await DELETE(request, buildParams('10'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      const calls = mockDb.query.mock.calls;
      const sqlCalls = calls.map((c: any[]) => c[0] as string);
      expect(sqlCalls.some((s) => s === 'ROLLBACK')).toBe(true);
    });

    it('should return 500 on database error during SELECT check', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockRejectedValueOnce(new Error('DB connection lost'));

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await DELETE(request, buildParams('10'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even when an error occurs', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockRejectedValue(new Error('DB error'));

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      await DELETE(request, buildParams('10'));

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should call client.end() after a successful delete', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 10, email: 'cust@example.com' }] })
        .mockResolvedValue({ rows: [] }); // all remaining calls

      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      await DELETE(request, buildParams('10'));

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should call validateAdminSession with the header session token', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 5, email: 'c@example.com' }] })
        .mockResolvedValue({ rows: [] });

      const sessionToken = 'specific-session-token';
      const request = createMockRequest({
        method: 'DELETE',
        headers: { 'x-session-token': sessionToken },
      });

      await DELETE(request, buildParams('5'));

      expect(validateAdminSession).toHaveBeenCalledWith(sessionToken);
    });
  });
});
