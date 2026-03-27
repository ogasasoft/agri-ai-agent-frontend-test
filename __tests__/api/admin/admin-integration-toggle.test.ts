/** @jest-environment node */

// FILE: __tests__/api/admin/admin-integration-toggle.test.ts

import { POST } from '@/app/api/admin/integrations/[integrationId]/toggle/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn().mockResolvedValue(undefined),
  getClientInfo: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
  isSuperAdmin: jest.fn().mockReturnValue(true),
}));

jest.mock('@/lib/security', () => ({
  createErrorResponse: jest.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: false, message: msg }, { status });
  }),
  addSecurityHeaders: jest.fn().mockImplementation((response: Response) => response),
}));

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(),
}));

describe('/api/admin/integrations/[integrationId]/toggle', () => {
  const { validateAdminSession, isSuperAdmin } = require('@/lib/admin-auth');
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
    isSuperAdmin.mockReturnValue(true);
  });

  // ---------------------------------------------------------------------------
  // Auth guards
  // ---------------------------------------------------------------------------

  describe('authentication and authorization guards', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'POST' });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when validateAdminSession returns null', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'invalid-session' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not super admin', async () => {
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);
      isSuperAdmin.mockReturnValue(false);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
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
        // No x-csrf-token
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------

  describe('input validation', () => {
    it('should return 400 for a non-numeric integrationId', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: 'abc' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when integration does not exist', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // not found

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Toggle on (inactive → active)
  // ---------------------------------------------------------------------------

  describe('toggle integration from inactive to active', () => {
    it('should toggle an inactive integration to active and return is_active true', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          // SELECT: integration currently inactive
          rows: [{ id: 2, name: 'Tabechoku', is_active: false }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE is_active
        .mockResolvedValueOnce({ rows: [] }); // INSERT audit log

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '2' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.integration.is_active).toBe(true);
      expect(data.integration.name).toBe('Tabechoku');
      expect(data.message).toContain('有効');
    });

    it('should pass newStatus=true to UPDATE query when toggling inactive→active', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 2, name: 'Tabechoku', is_active: false }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      await POST(request, { params: { integrationId: '2' } });

      // The second query call is the UPDATE; first param is newStatus (true)
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE api_integrations'),
        [true, 2]
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Toggle off (active → inactive)
  // ---------------------------------------------------------------------------

  describe('toggle integration from active to inactive', () => {
    it('should toggle an active integration to inactive and return is_active false', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'ColorMi Shop', is_active: true }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.integration.is_active).toBe(false);
      expect(data.message).toContain('無効');
    });

    it('should pass newStatus=false to UPDATE query when toggling active→inactive', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'ColorMi Shop', is_active: true }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      await POST(request, { params: { integrationId: '1' } });

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE api_integrations'),
        [false, 1]
      );
    });

    it('should include the integration name in the response message', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 5, name: 'My Custom API', is_active: true }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '5' } });
      const data = await response.json();

      expect(data.message).toContain('My Custom API');
    });
  });

  // ---------------------------------------------------------------------------
  // Audit logging
  // ---------------------------------------------------------------------------

  describe('audit logging', () => {
    it('should insert an audit log entry with TOGGLE_INTEGRATION action', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'ColorMi Shop', is_active: false }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // audit log

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      await POST(request, { params: { integrationId: '1' } });

      const auditCall = mockDb.query.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('admin_audit_logs')
      );
      expect(auditCall).toBeDefined();
      const details = JSON.parse(auditCall[1][2]);
      expect(details.integrationId).toBe(1);
      expect(details.integrationName).toBe('ColorMi Shop');
      expect(typeof details.previousStatus).toBe('boolean');
      expect(typeof details.newStatus).toBe('boolean');
      expect(details.previousStatus).toBe(false);
      expect(details.newStatus).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Database error
  // ---------------------------------------------------------------------------

  describe('database error handling', () => {
    it('should return 500 when getDbClient throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      getDbClient.mockRejectedValue(new Error('DB unavailable'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return 500 when the SELECT query throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('Query execution error'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should always call client.end() even on error', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('Query error'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      await POST(request, { params: { integrationId: '1' } });

      expect(mockDb.end).toHaveBeenCalledTimes(1);
    });

    it('should read session token from cookie when header is absent', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'cookie-session-tok' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-tok');
      expect(response.status).toBe(403);
    });
  });
});
