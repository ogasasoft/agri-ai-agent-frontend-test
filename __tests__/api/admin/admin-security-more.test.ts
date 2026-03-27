/** @jest-environment node */

// FILE: __tests__/api/admin/admin-security-more.test.ts

import { GET as getRateLimits } from '@/app/api/admin/security/rate-limits/route';
import { GET as getActivities } from '@/app/api/admin/dashboard/activities/route';
import {
  createMockRequest,
  MockDbClient,
  createMockUser,
  resetTestDatabase,
} from '../../setup/test-utils';

// Mock pg module to use our MockDbClient
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance()),
}));

// Mock admin-auth module
jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn(),
  getClientInfo: jest.fn().mockReturnValue({
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Agent',
  }),
  isSuperAdmin: jest.fn().mockReturnValue(true),
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/security/rate-limits
// ─────────────────────────────────────────────────────────────────────────────
describe('/api/admin/security/rate-limits', () => {
  let mockClient: MockDbClient;
  const { validateAdminSession } = require('@/lib/admin-auth');

  beforeEach(async () => {
    await resetTestDatabase();
    mockClient = MockDbClient.getInstance();
    validateAdminSession.mockClear();
  });

  it('should return 401 when no session token is provided', async () => {
    const request = createMockRequest({ method: 'GET' });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('認証が必要です');
  });

  it('should return 401 when session token is provided via cookie but not valid admin session', async () => {
    validateAdminSession.mockResolvedValue(null);

    // Still reachable via cookie path for the 403 test, but first test the 403 branch
    const request = createMockRequest({
      method: 'GET',
      cookies: { session_token: '' }, // empty cookie — treated as no token
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    // Empty string is falsy → should be 401
    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return 403 when session token is valid but user is not admin', async () => {
    validateAdminSession.mockResolvedValue(null); // not an admin

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'non-admin-session' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('管理者権限が必要です');
  });

  it('should return 200 with rateLimits array for valid admin session', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const mockRateLimitRows = [
      {
        identifier: '127.0.0.1',
        category: 'login',
        attempts: 3,
        window_start: new Date().toISOString(),
        last_attempt: new Date().toISOString(),
      },
      {
        identifier: '192.168.1.5',
        category: 'upload',
        attempts: 1,
        window_start: new Date().toISOString(),
        last_attempt: new Date().toISOString(),
      },
    ];

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: mockRateLimitRows });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.rateLimits)).toBe(true);
    expect(data.rateLimits).toHaveLength(2);
  });

  it('should return correct rate limit row shape', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const row = {
      identifier: '10.0.0.1',
      category: 'chat',
      attempts: 25,
      window_start: new Date().toISOString(),
      last_attempt: new Date().toISOString(),
    };

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [row] });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(data.rateLimits[0]).toMatchObject({
      identifier: '10.0.0.1',
      category: 'chat',
      attempts: 25,
    });
  });

  it('should accept session token from cookie', async () => {
    const adminUser = createMockUser({ id: 2, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      cookies: { session_token: 'cookie-admin-token' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(validateAdminSession).toHaveBeenCalledWith('cookie-admin-token');
  });

  it('should prioritize header token over cookie token', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'header-token' },
      cookies: { session_token: 'cookie-token' },
    });

    await getRateLimits(request);

    expect(validateAdminSession).toHaveBeenCalledWith('header-token');
    expect(validateAdminSession).not.toHaveBeenCalledWith('cookie-token');
  });

  it('should return empty rateLimits array when rate_limits table does not exist', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    // Simulate a missing table error (caught internally → empty array returned)
    mockClient.query = jest.fn().mockRejectedValueOnce(
      new Error('relation "rate_limits" does not exist')
    );

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    // Inner catch swallows the table-not-found error → returns 200 with empty array
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rateLimits).toEqual([]);
  });

  it('should return 200 with empty rateLimits when no recent rate limit activity', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rateLimits).toEqual([]);
  });

  it('should return 500 when validateAdminSession throws an unexpected error', async () => {
    validateAdminSession.mockRejectedValue(new Error('Unexpected DB failure'));

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'any-token' },
    });

    const response = await getRateLimits(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('サーバーエラーが発生しました');
  });

  it('should call validateAdminSession with the provided session token', async () => {
    validateAdminSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'specific-token-123' },
    });

    await getRateLimits(request);

    expect(validateAdminSession).toHaveBeenCalledWith('specific-token-123');
    expect(validateAdminSession).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/activities
// ─────────────────────────────────────────────────────────────────────────────
describe('/api/admin/dashboard/activities', () => {
  let mockClient: MockDbClient;
  const { validateAdminSession } = require('@/lib/admin-auth');

  beforeEach(async () => {
    await resetTestDatabase();
    mockClient = MockDbClient.getInstance();
    validateAdminSession.mockClear();
  });

  it('should return 401 when no session token is provided', async () => {
    const request = createMockRequest({ method: 'GET' });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('認証が必要です。');
  });

  it('should return 403 when session is invalid or not admin', async () => {
    validateAdminSession.mockResolvedValue(null);

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'non-admin-token' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('管理者権限が必要です。');
  });

  it('should return 200 with activities array for valid admin', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const mockRows = [
      {
        id: 1,
        action: 'view_customers',
        target_type: 'customer',
        target_id: null,
        details: {},
        created_at: new Date('2024-01-15T10:00:00Z'),
        admin_username: 'admin',
      },
      {
        id: 2,
        action: 'create_customer',
        target_type: 'customer',
        target_id: 5,
        details: {},
        created_at: new Date('2024-01-15T11:00:00Z'),
        admin_username: 'admin',
      },
    ];

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: mockRows });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.activities)).toBe(true);
    expect(data.activities).toHaveLength(2);
  });

  it('should transform view_customers action to correct message and severity', async () => {
    const adminUser = createMockUser({ id: 1, username: 'testadmin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const mockRows = [
      {
        id: 10,
        action: 'view_customers',
        target_type: 'customer',
        target_id: null,
        details: {},
        created_at: new Date('2024-01-15T10:00:00Z'),
        admin_username: 'testadmin',
      },
    ];

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: mockRows });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    const activity = data.activities[0];
    expect(activity.message).toBe('testadminが顧客リストを閲覧しました');
    expect(activity.severity).toBe('info');
    expect(activity.type).toBe('view_customers');
    expect(activity.id).toBe('10');
  });

  it('should transform create_customer action to success severity', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 11,
        action: 'create_customer',
        target_type: 'customer',
        target_id: 7,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    const activity = data.activities[0];
    expect(activity.message).toBe('adminが新しい顧客を作成しました');
    expect(activity.severity).toBe('success');
  });

  it('should transform view_prompts action correctly', async () => {
    const adminUser = createMockUser({ id: 1, username: 'moderator', is_super_admin: false });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 20,
        action: 'view_prompts',
        target_type: 'prompt',
        target_id: null,
        details: {},
        created_at: new Date(),
        admin_username: 'moderator',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'moderator-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].message).toBe('moderatorがシステムプロンプトを閲覧しました');
    expect(data.activities[0].severity).toBe('info');
  });

  it('should transform create_prompt action to success severity', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 21,
        action: 'create_prompt',
        target_type: 'prompt',
        target_id: 3,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].message).toBe('adminが新しいプロンプトを作成しました');
    expect(data.activities[0].severity).toBe('success');
  });

  it('should transform update_prompt action to success severity', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 22,
        action: 'update_prompt',
        target_type: 'prompt',
        target_id: 3,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].message).toBe('adminがプロンプトを更新しました');
    expect(data.activities[0].severity).toBe('success');
  });

  it('should transform view_integrations action correctly', async () => {
    const adminUser = createMockUser({ id: 1, username: 'sysadmin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 30,
        action: 'view_integrations',
        target_type: 'integration',
        target_id: null,
        details: {},
        created_at: new Date(),
        admin_username: 'sysadmin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].message).toBe('sysadminがAPI連携設定を閲覧しました');
    expect(data.activities[0].severity).toBe('info');
  });

  it('should transform update_integration action to success severity', async () => {
    const adminUser = createMockUser({ id: 1, username: 'sysadmin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 31,
        action: 'update_integration',
        target_type: 'integration',
        target_id: 2,
        details: {},
        created_at: new Date(),
        admin_username: 'sysadmin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].message).toBe('sysadminがAPI連携設定を更新しました');
    expect(data.activities[0].severity).toBe('success');
  });

  it('should use default message and info severity for unknown action', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 99,
        action: 'some_unknown_action',
        target_type: 'unknown',
        target_id: null,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    const activity = data.activities[0];
    expect(activity.message).toContain('admin');
    expect(activity.message).toContain('some_unknown_action');
    expect(activity.severity).toBe('info');
  });

  it('should return activity with id converted to string', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 42,
        action: 'view_customers',
        target_type: 'customer',
        target_id: null,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(data.activities[0].id).toBe('42');
    expect(typeof data.activities[0].id).toBe('string');
  });

  it('should return activity with timestamp as a localized string', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const createdAt = new Date('2024-01-15T10:30:00Z');
    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 5,
        action: 'view_customers',
        target_type: 'customer',
        target_id: null,
        details: {},
        created_at: createdAt,
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(typeof data.activities[0].timestamp).toBe('string');
    expect(data.activities[0].timestamp.length).toBeGreaterThan(0);
  });

  it('should return empty activities array when no logs exist', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.activities).toEqual([]);
  });

  it('should accept session token from cookie', async () => {
    const adminUser = createMockUser({ id: 2, username: 'cookieadmin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      cookies: { session_token: 'cookie-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(validateAdminSession).toHaveBeenCalledWith('cookie-admin-session');
  });

  it('should prioritize header token over cookie token', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'header-session' },
      cookies: { session_token: 'cookie-session' },
    });

    await getActivities(request);

    expect(validateAdminSession).toHaveBeenCalledWith('header-session');
    expect(validateAdminSession).not.toHaveBeenCalledWith('cookie-session');
  });

  it('should return 500 when database query throws', async () => {
    const adminUser = createMockUser({ id: 1, is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockRejectedValueOnce(new Error('DB connection lost'));

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('サーバーエラーが発生しました。');
  });

  it('should return 500 when validateAdminSession throws', async () => {
    validateAdminSession.mockRejectedValue(new Error('Session store unavailable'));

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'any-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('サーバーエラーが発生しました。');
  });

  it('should return all required fields on each activity object', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    mockClient.query = jest.fn().mockResolvedValueOnce({
      rows: [{
        id: 1,
        action: 'view_customers',
        target_type: 'customer',
        target_id: null,
        details: {},
        created_at: new Date(),
        admin_username: 'admin',
      }],
    });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    const activity = data.activities[0];
    expect(activity).toHaveProperty('id');
    expect(activity).toHaveProperty('type');
    expect(activity).toHaveProperty('message');
    expect(activity).toHaveProperty('timestamp');
    expect(activity).toHaveProperty('severity');
  });

  it('should handle multiple activities with mixed action types', async () => {
    const adminUser = createMockUser({ id: 1, username: 'admin', is_super_admin: true });
    validateAdminSession.mockResolvedValue(adminUser);

    const rows = [
      { id: 1, action: 'view_customers', target_type: 'customer', target_id: null, details: {}, created_at: new Date(), admin_username: 'admin' },
      { id: 2, action: 'create_prompt', target_type: 'prompt', target_id: 1, details: {}, created_at: new Date(), admin_username: 'admin' },
      { id: 3, action: 'update_integration', target_type: 'integration', target_id: 1, details: {}, created_at: new Date(), admin_username: 'admin' },
      { id: 4, action: 'unknown_action', target_type: 'other', target_id: null, details: {}, created_at: new Date(), admin_username: 'admin' },
    ];

    mockClient.query = jest.fn().mockResolvedValueOnce({ rows });

    const request = createMockRequest({
      method: 'GET',
      headers: { 'x-session-token': 'valid-admin-session' },
    });

    const response = await getActivities(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities).toHaveLength(4);

    const severities = data.activities.map((a: any) => a.severity);
    expect(severities).toContain('info');
    expect(severities).toContain('success');
  });
});
