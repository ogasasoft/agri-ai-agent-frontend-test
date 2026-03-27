/** @jest-environment node */

// FILE: __tests__/api/admin/admin-integration-sync.test.ts

import { POST } from '@/app/api/admin/integrations/[integrationId]/sync/route';
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

describe('/api/admin/integrations/[integrationId]/sync', () => {
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
    // Default: valid super admin
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

    it('should return 401 when session token is only in header', async () => {
      validateAdminSession.mockResolvedValue(null);
      isSuperAdmin.mockReturnValue(false);

      // No header, no cookie
      const request = createMockRequest({ method: 'POST', url: 'http://localhost:3000' });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
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

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // integration not found

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when integration is inactive', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'ColorMi Shop',
          type: 'colormi',
          api_endpoint: 'https://api.colormi.jp',
          api_key: 'test-key',
          settings: {},
          is_active: false, // inactive
        }],
      });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Sync success — colormi
  // ---------------------------------------------------------------------------

  describe('sync success for colormi integration', () => {
    it('should sync colormi orders and return success', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      // 1) GET integration row
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'ColorMi Shop',
            type: 'colormi',
            api_endpoint: 'https://api.colormi.jp',
            api_key: 'colormi-api-key',
            settings: {},
            is_active: true,
          }],
        })
        // 2) INSERT order (called once per order)
        .mockResolvedValueOnce({ rows: [] })
        // 3) UPDATE last_synced_at
        .mockResolvedValueOnce({ rows: [] })
        // 4) INSERT admin_audit_logs
        .mockResolvedValueOnce({ rows: [] });

      // Mock the external ColorMi API fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          orders: [
            {
              id: 'cm-001',
              orderNumber: 'CM-001',
              customerName: '田中太郎',
              customerEmail: 'tanaka@example.com',
              productName: '有機トマト',
              quantity: 2,
              unitPrice: 500,
              totalAmount: 1000,
              orderDate: '2024-01-15T00:00:00Z',
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(true);
      expect(data.syncResult.syncedRecords).toBe(1);
      expect(data.syncResult.message).toContain('ColorMi');
      expect(data.integration.type).toBe('colormi');
    });

    it('should return syncResult.success false when colormi API returns non-ok', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'ColorMi Shop',
            type: 'colormi',
            api_endpoint: 'https://api.colormi.jp',
            api_key: 'bad-key',
            settings: {},
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE last_synced_at
        .mockResolvedValueOnce({ rows: [] }); // audit log

      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(false);
      expect(data.syncResult.message).toContain('同期に失敗しました');
    });

    it('should handle an empty orders array from colormi', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            name: 'ColorMi Shop',
            type: 'colormi',
            api_endpoint: 'https://api.colormi.jp',
            api_key: 'key',
            settings: {},
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '2' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(true);
      expect(data.syncResult.syncedRecords).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Sync success — tabechoku
  // ---------------------------------------------------------------------------

  describe('sync success for tabechoku integration', () => {
    it('should sync tabechoku products and return success', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 3,
            name: 'Tabechoku',
            type: 'tabechoku',
            api_endpoint: 'https://api.tabechoku.com',
            api_key: 'tabechoku-key',
            settings: {},
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // INSERT product
        .mockResolvedValueOnce({ rows: [] }) // UPDATE last_synced_at
        .mockResolvedValueOnce({ rows: [] }); // audit log

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              id: 'tb-p-001',
              code: 'TB-P-001',
              name: '新鮮野菜セット',
              price: 2500,
            },
          ],
        }),
      });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '3' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(true);
      expect(data.syncResult.syncedRecords).toBe(1);
      expect(data.syncResult.message).toContain('Tabechoku');
      expect(data.integration.type).toBe('tabechoku');
    });

    it('should return syncResult.success false when tabechoku API returns non-ok', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 3,
            name: 'Tabechoku',
            type: 'tabechoku',
            api_endpoint: 'https://api.tabechoku.com',
            api_key: 'bad-key',
            settings: {},
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '3' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Unsupported integration type
  // ---------------------------------------------------------------------------

  describe('unsupported integration type', () => {
    it('should return syncResult.success false for unknown type', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 5,
            name: 'Unknown API',
            type: 'unknown_type',
            api_endpoint: 'https://api.unknown.com',
            api_key: 'key',
            settings: {},
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '5' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncResult.success).toBe(false);
      expect(data.syncResult.message).toContain('同期に失敗しました');
    });
  });

  // ---------------------------------------------------------------------------
  // Database error
  // ---------------------------------------------------------------------------

  describe('database error handling', () => {
    it('should return 500 when getDbClient throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      getDbClient.mockRejectedValue(new Error('DB connection failed'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return 500 when integration query throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('Query execution failed'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should always call client.end() even when an error occurs', async () => {
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
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'cookie-session' },
      });

      // validateAdminSession not called yet — just verify 403 since no admin
      validateAdminSession.mockResolvedValue(null);

      const response = await POST(request, { params: { integrationId: '1' } });

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session');
      expect(response.status).toBe(403);
    });
  });
});
