/** @jest-environment node */

// FILE: __tests__/api/admin/admin-integration-test.test.ts

import { POST } from '@/app/api/admin/integrations/[integrationId]/test/route';
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

describe('/api/admin/integrations/[integrationId]/test', () => {
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

      const response = await POST(request, { params: { integrationId: 'not-a-number' } });
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
  // Test connection success — colormi
  // ---------------------------------------------------------------------------

  describe('test connection for colormi integration', () => {
    it('should return testResult.success true when colormi API responds ok', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'ColorMi Shop',
            type: 'colormi',
            api_endpoint: 'https://api.colormi.jp',
            api_key: 'colormi-key',
            settings: {},
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE last_tested_at
        .mockResolvedValueOnce({ rows: [] }); // audit log

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.testResult.success).toBe(true);
      expect(data.testResult.message).toContain('ColorMi');
      expect(data.testResult.status).toBe('200');
      expect(data.integration.type).toBe('colormi');
    });

    it('should return testResult.success false when colormi API returns non-ok status', async () => {
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
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true); // outer success (the test ran)
      expect(data.testResult.success).toBe(false);
      expect(data.testResult.message).toContain('失敗');
      expect(data.testResult.status).toBe('401');
    });
  });

  // ---------------------------------------------------------------------------
  // Test connection success — tabechoku
  // ---------------------------------------------------------------------------

  describe('test connection for tabechoku integration', () => {
    it('should return testResult.success true when tabechoku API responds ok', async () => {
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
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '3' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testResult.success).toBe(true);
      expect(data.testResult.message).toContain('Tabechoku');
      expect(data.integration.type).toBe('tabechoku');
    });

    it('should return testResult.success false when tabechoku API returns non-ok status', async () => {
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
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '3' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testResult.success).toBe(false);
      expect(data.testResult.status).toBe('503');
    });
  });

  // ---------------------------------------------------------------------------
  // Generic / unknown integration type
  // ---------------------------------------------------------------------------

  describe('test connection for generic integration type', () => {
    it('should use HEAD request for unknown integration type', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 9,
            name: 'Other API',
            type: 'other',
            api_endpoint: 'https://api.other.com',
            api_key: 'key',
            settings: {},
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = mockFetch;

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '9' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testResult.success).toBe(true);
      // Generic path calls fetch with HEAD
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.other.com',
        expect.objectContaining({ method: 'HEAD' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Network / fetch error
  // ---------------------------------------------------------------------------

  describe('fetch error handling', () => {
    it('should set testResult.success false and status "error" when fetch throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'ColorMi Shop',
            type: 'colormi',
            api_endpoint: 'https://api.colormi.jp',
            api_key: 'key',
            settings: {},
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'));

      const request = createMockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'valid-session', 'x-csrf-token': 'valid-csrf' },
      });

      const response = await POST(request, { params: { integrationId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testResult.success).toBe(false);
      expect(data.testResult.status).toBe('error');
      expect(data.testResult.message).toContain('接続テストに失敗しました');
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

    it('should return 500 when integration query throws', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('Query error'));

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
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'cookie-session-token' },
      });

      validateAdminSession.mockResolvedValue(null);

      const response = await POST(request, { params: { integrationId: '1' } });

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(403);
    });
  });
});
