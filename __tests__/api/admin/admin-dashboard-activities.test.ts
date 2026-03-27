/** @jest-environment node */

// FILE: __tests__/api/admin/admin-dashboard-activities.test.ts

import { GET } from '@/app/api/admin/dashboard/activities/route';
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

describe('/api/admin/dashboard/activities', () => {
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
  // Auth guards
  // ---------------------------------------------------------------------------

  describe('authentication and authorization guards', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('認証が必要です。');
    });

    it('should return 401 when there is no session token header or cookie', async () => {
      const request = createMockRequest({ method: 'GET', url: 'http://localhost:3000' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when validateAdminSession returns null (non-admin)', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'non-admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toBe('管理者権限が必要です。');
    });

    it('should accept session token from cookie', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-admin-session' },
      });

      const response = await GET(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-admin-session');
      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Successful responses — activity list
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/dashboard/activities — success cases', () => {
    it('should return an empty activities array when no audit logs exist', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.activities).toEqual([]);
    });

    it('should transform audit log rows into activity objects', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            action: 'view_customers',
            target_type: null,
            target_id: null,
            details: null,
            created_at: '2024-01-15T10:00:00Z',
            admin_username: 'admin',
          },
        ],
      });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toHaveLength(1);
      const activity = data.activities[0];
      expect(activity.id).toBe('1');
      expect(activity.type).toBe('view_customers');
      expect(typeof activity.message).toBe('string');
      expect(typeof activity.timestamp).toBe('string');
      expect(activity.severity).toBeDefined();
    });

    it('should return at most 20 activities (query uses LIMIT 20)', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const rows = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        action: 'view_customers',
        target_type: null,
        target_id: null,
        details: null,
        created_at: '2024-01-15T10:00:00Z',
        admin_username: 'admin',
      }));

      mockDb.query.mockResolvedValueOnce({ rows });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activities).toHaveLength(20);
      // Verify the underlying query contained LIMIT 20
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT 20'));
    });
  });

  // ---------------------------------------------------------------------------
  // Action type → message / severity mapping
  // ---------------------------------------------------------------------------

  describe('action type message and severity mapping', () => {
    const adminUsername = 'superadmin';

    function makeRow(action: string, id = 1) {
      return {
        id,
        action,
        target_type: null,
        target_id: null,
        details: null,
        created_at: '2024-01-15T12:00:00Z',
        admin_username: adminUsername,
      };
    }

    async function getActivitiesForAction(action: string) {
      const adminUser = createMockUser({ id: 1 });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValueOnce({ rows: [makeRow(action)] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();
      return data.activities[0];
    }

    it('should map view_customers to info severity', async () => {
      const activity = await getActivitiesForAction('view_customers');
      expect(activity.severity).toBe('info');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('顧客リスト');
    });

    it('should map create_customer to success severity', async () => {
      const activity = await getActivitiesForAction('create_customer');
      expect(activity.severity).toBe('success');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('顧客');
    });

    it('should map view_prompts to info severity', async () => {
      const activity = await getActivitiesForAction('view_prompts');
      expect(activity.severity).toBe('info');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('プロンプト');
    });

    it('should map create_prompt to success severity', async () => {
      const activity = await getActivitiesForAction('create_prompt');
      expect(activity.severity).toBe('success');
      expect(activity.message).toContain(adminUsername);
    });

    it('should map update_prompt to success severity', async () => {
      const activity = await getActivitiesForAction('update_prompt');
      expect(activity.severity).toBe('success');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('プロンプト');
    });

    it('should map view_integrations to info severity', async () => {
      const activity = await getActivitiesForAction('view_integrations');
      expect(activity.severity).toBe('info');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('API連携');
    });

    it('should map update_integration to success severity', async () => {
      const activity = await getActivitiesForAction('update_integration');
      expect(activity.severity).toBe('success');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('API連携');
    });

    it('should handle unknown action types via default case', async () => {
      const activity = await getActivitiesForAction('unknown_custom_action');
      expect(activity.severity).toBe('info');
      expect(activity.message).toContain(adminUsername);
      expect(activity.message).toContain('unknown_custom_action');
    });

    it('should include the action type in the id field as a string', async () => {
      const activity = await getActivitiesForAction('view_customers');
      expect(typeof activity.id).toBe('string');
      expect(activity.id).toBe('1');
    });

    it('should include a timestamp field as a string', async () => {
      const activity = await getActivitiesForAction('create_customer');
      expect(typeof activity.timestamp).toBe('string');
      expect(activity.timestamp.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple activities in one response
  // ---------------------------------------------------------------------------

  describe('multiple activities in a single response', () => {
    it('should return all activities with correct types in order', async () => {
      const adminUser = createMockUser({ id: 1 });
      validateAdminSession.mockResolvedValue(adminUser);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            action: 'update_integration',
            target_type: null,
            target_id: null,
            details: null,
            created_at: '2024-01-15T14:00:00Z',
            admin_username: 'admin1',
          },
          {
            id: 9,
            action: 'create_customer',
            target_type: null,
            target_id: null,
            details: null,
            created_at: '2024-01-15T13:00:00Z',
            admin_username: 'admin2',
          },
          {
            id: 8,
            action: 'view_integrations',
            target_type: null,
            target_id: null,
            details: null,
            created_at: '2024-01-15T12:00:00Z',
            admin_username: 'admin1',
          },
          {
            id: 7,
            action: 'update_prompt',
            target_type: null,
            target_id: null,
            details: null,
            created_at: '2024-01-15T11:00:00Z',
            admin_username: 'mod',
          },
        ],
      });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.activities).toHaveLength(4);

      expect(data.activities[0].type).toBe('update_integration');
      expect(data.activities[0].severity).toBe('success');

      expect(data.activities[1].type).toBe('create_customer');
      expect(data.activities[1].severity).toBe('success');

      expect(data.activities[2].type).toBe('view_integrations');
      expect(data.activities[2].severity).toBe('info');

      expect(data.activities[3].type).toBe('update_prompt');
      expect(data.activities[3].severity).toBe('success');
    });
  });

  // ---------------------------------------------------------------------------
  // Database error
  // ---------------------------------------------------------------------------

  describe('database error handling', () => {
    it('should return 500 when getDbClient throws', async () => {
      const adminUser = createMockUser({ id: 1 });
      validateAdminSession.mockResolvedValue(adminUser);
      getDbClient.mockRejectedValue(new Error('Cannot connect to DB'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('サーバーエラーが発生しました。');
    });

    it('should return 500 when the query throws', async () => {
      const adminUser = createMockUser({ id: 1 });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('Query failed'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('サーバーエラーが発生しました。');
    });

    it('should always call client.end() even on query error', async () => {
      const adminUser = createMockUser({ id: 1 });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('Query error'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' },
      });

      await GET(request);

      expect(mockDb.end).toHaveBeenCalledTimes(1);
    });
  });
});
