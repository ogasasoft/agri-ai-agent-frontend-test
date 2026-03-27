/** @jest-environment node */

// FILE: __tests__/api/admin/admin-security.test.ts

import { GET as getSecurityEvents } from '@/app/api/admin/security/events/route';
import { GET as getSecurityStats } from '@/app/api/admin/security/stats/route';
import { createMockRequest, createMockUser } from '../../setup/test-utils';

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn().mockResolvedValue(undefined),
  getClientInfo: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test-agent' }),
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

describe('/api/admin/security', () => {
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
  // GET /api/admin/security/events
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/security/events', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is invalid', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'invalid-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return mock security events on success', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });

    it('should return 3 mock security events', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(3);
    });

    it('should return events with expected structure', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstEvent = data.events[0];
      expect(firstEvent).toHaveProperty('id');
      expect(firstEvent).toHaveProperty('event_type');
      expect(firstEvent).toHaveProperty('severity');
      expect(firstEvent).toHaveProperty('ip_address');
      expect(firstEvent).toHaveProperty('user_agent');
      expect(firstEvent).toHaveProperty('details');
      expect(firstEvent).toHaveProperty('created_at');
    });

    it('should return events with correct event types', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      const eventTypes = data.events.map((e: any) => e.event_type);
      expect(eventTypes).toContain('LOGIN_FAILURE');
      expect(eventTypes).toContain('RATE_LIMIT_EXCEEDED');
      expect(eventTypes).toContain('SUSPICIOUS_ACTIVITY');
    });

    it('should return events with correct severity levels', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      const severities = data.events.map((e: any) => e.severity);
      expect(severities).toContain('medium');
      expect(severities).toContain('high');
      expect(severities).toContain('critical');
    });

    it('should accept session token from cookie', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-session-token' },
      });

      const response = await getSecurityEvents(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-session-token');
      expect(response.status).toBe(200);
    });

    it('should return 500 when validateAdminSession throws an error', async () => {
      validateAdminSession.mockRejectedValue(new Error('Session validation failed'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'some-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return 500 when getDbClient throws an error', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      getDbClient.mockRejectedValue(new Error('Cannot connect to DB'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call validateAdminSession with correct session token', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);

      const sessionToken = 'specific-session-token-events';
      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': sessionToken },
      });

      await getSecurityEvents(request);

      expect(validateAdminSession).toHaveBeenCalledWith(sessionToken);
      expect(validateAdminSession).toHaveBeenCalledTimes(1);
    });

    it('should work for a regular admin (not just super admin)', async () => {
      // The events route only checks adminUser != null, not super admin status
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'regular-admin-session' },
      });

      const response = await getSecurityEvents(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/admin/security/stats
  // ---------------------------------------------------------------------------

  describe('GET /api/admin/security/stats', () => {
    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({ method: 'GET' });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin session is invalid', async () => {
      validateAdminSession.mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'invalid-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return security stats on success', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      // DB query for failed login count
      mockDb.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
    });

    it('should return stats with expected fields', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [{ count: '3' }] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(data.stats).toHaveProperty('totalEvents');
      expect(data.stats).toHaveProperty('criticalEvents');
      expect(data.stats).toHaveProperty('failedLogins');
      expect(data.stats).toHaveProperty('blockedIPs');
      expect(data.stats).toHaveProperty('todayEvents');
      expect(data.stats).toHaveProperty('activeThreats');
    });

    it('should return correct failedLogins count from database', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      // 7 users have failed login attempts
      mockDb.query.mockResolvedValue({ rows: [{ count: '7' }] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.failedLogins).toBe(7);
    });

    it('should return failedLogins as 0 when DB count is empty', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      // No rows returned from DB
      mockDb.query.mockResolvedValue({ rows: [] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.failedLogins).toBe(0);
    });

    it('should return fixed stats values for totalEvents, criticalEvents, etc.', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [{ count: '2' }] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(data.stats.totalEvents).toBe(15);
      expect(data.stats.criticalEvents).toBe(2);
      expect(data.stats.blockedIPs).toBe(3);
      expect(data.stats.todayEvents).toBe(8);
      expect(data.stats.activeThreats).toBe(1);
    });

    it('should accept session token from cookie', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-admin-session' },
      });

      const response = await getSecurityStats(request);

      expect(validateAdminSession).toHaveBeenCalledWith('cookie-admin-session');
      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('DB stats query failed'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should call client.end() even on database error', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockRejectedValue(new Error('DB failure'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' },
      });

      await getSecurityStats(request);

      expect(mockDb.end).toHaveBeenCalled();
    });

    it('should return 500 when validateAdminSession throws an error', async () => {
      validateAdminSession.mockRejectedValue(new Error('Session check crashed'));

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'some-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should work for a regular admin (not just super admin)', async () => {
      // Stats route only checks adminUser != null, no super admin check
      const regularAdmin = createMockUser({ id: 2, is_super_admin: false });
      validateAdminSession.mockResolvedValue(regularAdmin);
      mockDb.query.mockResolvedValue({ rows: [{ count: '1' }] });

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'regular-admin-session' },
      });

      const response = await getSecurityStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should call validateAdminSession with correct session token', async () => {
      const adminUser = createMockUser({ id: 1, is_super_admin: true });
      validateAdminSession.mockResolvedValue(adminUser);
      mockDb.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const sessionToken = 'specific-session-token-stats';
      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': sessionToken },
      });

      await getSecurityStats(request);

      expect(validateAdminSession).toHaveBeenCalledWith(sessionToken);
      expect(validateAdminSession).toHaveBeenCalledTimes(1);
    });
  });
});
