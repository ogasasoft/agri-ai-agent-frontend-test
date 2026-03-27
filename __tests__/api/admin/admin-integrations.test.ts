/** @jest-environment node */

// FILE: __tests__/api/admin/admin-integrations.test.ts

import { GET, PUT } from '@/app/api/admin/integrations/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn().mockResolvedValue(undefined),
  getClientInfo: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test-agent' }),
  isSuperAdmin: jest.fn(),
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

describe('/api/admin/integrations', () => {
  const { validateAdminSession, logAdminAction, isSuperAdmin } = require('@/lib/admin-auth');
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
    // Default: user is super admin
    isSuperAdmin.mockReturnValue(true);
    logAdminAction.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // GET /api/admin/integrations
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/integrations', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toContain('認証');
    });

    it('should return 403 when admin session is null', async () => {
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

    it('should return 403 when user is not super admin', async () => {
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);
      isSuperAdmin.mockReturnValue(false);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'non-super-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return integrations list on success', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const mockIntegrations = [
        {
          id: 1,
          name: 'colormi',
          display_name: 'ColorMi Shop',
          base_url: 'https://colormi.example.com',
          api_key: '[設定済み]',
          api_secret: null,
          webhook_url: null,
          is_active: true,
          configuration: {},
          last_sync_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'tabechoku',
          display_name: 'Tabechoku',
          base_url: 'https://tabechoku.example.com',
          api_key: null,
          api_secret: null,
          webhook_url: null,
          is_active: false,
          configuration: {},
          last_sync_at: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockDb.query.mockResolvedValue({ rows: mockIntegrations });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-super-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.integrations).toHaveLength(2);
      expect(data.integrations[0].name).toBe('colormi');
    });

    it('should return empty integrations array when none exist', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-super-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.integrations).toEqual([]);
    });

    it('should call logAdminAction after fetching integrations', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-super-session' },
      });

      await GET(request);

      expect(logAdminAction).toHaveBeenCalledWith(
        superAdmin.id,
        'view_integrations',
        'api_integration',
        undefined,
        expect.objectContaining({ total_integrations: 0 }),
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should return 500 on database error', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('DB failure'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-super-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even on database error', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('DB failure'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-super-session' },
      });

      await GET(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should accept session token from cookie', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-super-session' },
      });

      const response = await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-super-session');
      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // PUT /api/admin/integrations
  // ---------------------------------------------------------------------------

  describe('PUT /api/admin/integrations', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({
        method: 'PUT',
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is null', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'x-session-token': 'invalid-session' },
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user is not super admin', async () => {
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);
      isSuperAdmin.mockReturnValue(false);

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'non-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 403 when CSRF token is missing', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'PUT',
        headers: { 'x-session-token': 'valid-super-session' },
        // No CSRF token
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain('CSRF');
    });

    it('should return 400 when ID is missing from request body', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { base_url: 'https://new.example.com' }, // no id
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('ID');
    });

    it('should return 404 when integration is not found', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      // UPDATE returns 0 rows
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 999, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('見つかりません');
    });

    it('should update integration successfully', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const updatedRow = {
        id: 1,
        name: 'colormi',
        display_name: 'ColorMi Shop',
        base_url: 'https://new-colormi.example.com',
        api_key: 'my-secret-key',
        api_secret: null,
        webhook_url: null,
        is_active: true,
        configuration: {},
        last_sync_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
      };

      mockDb.query.mockResolvedValue({ rows: [updatedRow] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, base_url: 'https://new-colormi.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('更新');
      expect(data.integration).toBeDefined();
    });

    it('should mask api_key and api_secret in successful update response', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const updatedRow = {
        id: 1,
        name: 'colormi',
        api_key: 'real-secret-api-key',
        api_secret: 'real-secret-api-secret',
        base_url: 'https://colormi.example.com',
      };

      mockDb.query.mockResolvedValue({ rows: [updatedRow] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, api_key: 'real-secret-api-key' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.integration.api_key).toBe('[設定済み]');
      expect(data.integration.api_secret).toBe('[設定済み]');
    });

    it('should call logAdminAction after successful update', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const updatedRow = {
        id: 1,
        name: 'colormi',
        api_key: null,
        api_secret: null,
        base_url: 'https://colormi.example.com',
      };

      mockDb.query.mockResolvedValue({ rows: [updatedRow] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, base_url: 'https://colormi.example.com' },
      });

      await PUT(request);

      expect(logAdminAction).toHaveBeenCalledWith(
        superAdmin.id,
        'update_integration',
        'api_integration',
        '1',
        expect.objectContaining({ name: 'colormi' }),
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should update only provided fields (partial update)', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const updatedRow = {
        id: 1,
        name: 'tabechoku',
        api_key: 'some-key',
        api_secret: null,
        base_url: 'https://tabechoku.example.com',
        webhook_url: 'https://my-webhook.example.com',
      };

      mockDb.query.mockResolvedValue({ rows: [updatedRow] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, webhook_url: 'https://my-webhook.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 on database error during update', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('DB update failed'));

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even on database error during update', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);
      mockDb.query.mockRejectedValue(new Error('DB error'));

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, base_url: 'https://new.example.com' },
      });

      await PUT(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should update configuration field when provided', async () => {
      const superAdmin = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(superAdmin);

      const configuration = { shop_id: 'SHOP-001', seller_id: 'SELLER-999' };
      const updatedRow = {
        id: 1,
        name: 'colormi',
        api_key: null,
        api_secret: null,
        base_url: 'https://colormi.example.com',
        configuration,
      };

      mockDb.query.mockResolvedValue({ rows: [updatedRow] });

      const request = createMockRequest({
        method: 'PUT',
        headers: {
          'x-session-token': 'valid-super-session',
          'x-csrf-token': 'valid-csrf',
        },
        body: { id: 1, configuration },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
