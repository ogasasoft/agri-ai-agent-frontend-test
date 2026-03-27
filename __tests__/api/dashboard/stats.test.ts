/** @jest-environment node */

// FILE: __tests__/api/dashboard/stats.test.ts

import { GET } from '@/app/api/dashboard/stats/route';
import { createMockRequest, MockDbClient, createMockUser, createMockSession } from '../../setup/test-utils';

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(),
}));

jest.mock('@/lib/auth-error-details', () => ({
  AuthErrorBuilder: {
    sessionError: jest.fn().mockImplementation((code: string) => ({
      success: false,
      error_code: code,
      message: code === 'INVALID_SESSION' ? 'セッションが無効です' : 'セッションの有効期限が切れました',
    })),
  },
}));

jest.mock('@/lib/api-error-details', () => ({
  DatabaseErrorBuilder: {
    queryError: jest.fn().mockImplementation((query: string, error: any) => ({
      success: false,
      error_code: 'DATABASE_ERROR',
      message: error?.message || 'データベースエラーが発生しました',
    })),
  },
  logDatabaseOperation: jest.fn(),
}));

import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>;
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

// Helper to build 6 sequential mock query responses for the stats route
function setupStatsMocks(db: MockDbClient, overrides: Partial<{
  basicStats: object;
  dailyTrend: object[];
  topCustomers: object[];
  repeatCustomers: object;
  weekdayStats: object[];
  previousStats: object;
}> = {}) {
  const basicStats = overrides.basicStats ?? {
    total_shipped: '10',
    total_revenue: '50000',
    avg_order_value: '5000',
    unique_customers: '5',
  };
  const dailyTrend = overrides.dailyTrend ?? [
    { date: '2024-03-01', order_count: '3', revenue: '15000' },
  ];
  const topCustomers = overrides.topCustomers ?? [
    { customer_name: '田中太郎', order_count: '3', total_spent: '15000', avg_order_value: '5000' },
  ];
  const repeatCustomers = overrides.repeatCustomers ?? {
    new_customers: '3',
    repeat_customers: '2',
  };
  const weekdayStats = overrides.weekdayStats ?? [
    { weekday: '1', order_count: '5', revenue: '25000' },
  ];
  const previousStats = overrides.previousStats ?? {
    total_shipped: '8',
    total_revenue: '40000',
  };

  db.query
    .mockResolvedValueOnce({ rows: [basicStats] })       // 1. basicStats
    .mockResolvedValueOnce({ rows: dailyTrend })          // 2. dailyTrend
    .mockResolvedValueOnce({ rows: topCustomers })        // 3. topCustomers
    .mockResolvedValueOnce({ rows: [repeatCustomers] })   // 4. repeatCustomers
    .mockResolvedValueOnce({ rows: weekdayStats })        // 5. weekdayStats
    .mockResolvedValueOnce({ rows: [previousStats] });    // 6. previousStats
}

describe('/api/dashboard/stats', () => {
  let mockDb: MockDbClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = MockDbClient.getInstance();
    mockDb.clearMockData();
    mockGetDbClient.mockResolvedValue(mockDb as any);
  });

  // ---------------------------------------------------------------------------
  // Authentication failures
  // ---------------------------------------------------------------------------
  describe('Authentication failures', () => {
    it('should return 401 when no session token is provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error_code).toBe('INVALID_SESSION');
    });

    it('should return 401 when session token is invalid', async () => {
      mockValidateSession.mockResolvedValueOnce(null as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'bad-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error_code).toBe('EXPIRED_SESSION');
    });

    it('should return 401 when session has no user', async () => {
      mockValidateSession.mockResolvedValueOnce({ user: null, session: null } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'some-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------
  describe('Happy path', () => {
    it('should return complete stats structure on success', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('dateRange');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('dailyTrend');
      expect(data).toHaveProperty('topCustomers');
      expect(data).toHaveProperty('customerAnalysis');
      expect(data).toHaveProperty('weekdayStats');
    });

    it('should return correctly typed stats values', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(typeof data.stats.totalShipped).toBe('number');
      expect(typeof data.stats.totalRevenue).toBe('number');
      expect(typeof data.stats.avgOrderValue).toBe('number');
      expect(typeof data.stats.uniqueCustomers).toBe('number');
      expect(typeof data.stats.revenueGrowth).toBe('number');
      expect(typeof data.stats.orderGrowth).toBe('number');
    });

    it('should compute positive revenue growth correctly', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      // current: 60000, previous: 40000 → growth = 50%
      setupStatsMocks(mockDb, {
        basicStats: { total_shipped: '12', total_revenue: '60000', avg_order_value: '5000', unique_customers: '6' },
        previousStats: { total_shipped: '8', total_revenue: '40000' },
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.revenueGrowth).toBe(50);
    });

    it('should return 0 growth when previous revenue is 0', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        previousStats: { total_shipped: '0', total_revenue: '0' },
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.revenueGrowth).toBe(0);
      expect(data.stats.orderGrowth).toBe(0);
    });

    it('should use date range from query parameters', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats?from=2024-01-01&to=2024-01-31',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dateRange.from).toBe('2024-01-01');
      expect(data.dateRange.to).toBe('2024-01-31');
    });

    it('should use default date range when no query params are provided', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Default range should end at today
      const today = new Date().toISOString().split('T')[0];
      expect(data.dateRange.to).toBe(today);
    });

    it('should accept session token from cookie', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        cookies: { session_token: 'cookie-session-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should map daily trend rows to correct shape', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        dailyTrend: [
          { date: '2024-03-01', order_count: '2', revenue: '10000' },
          { date: '2024-03-02', order_count: '5', revenue: '25000' },
        ],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.dailyTrend).toHaveLength(2);
      expect(data.dailyTrend[0]).toEqual({
        date: '2024-03-01',
        orderCount: 2,
        revenue: 10000,
      });
    });

    it('should map top customers rows to correct shape', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        topCustomers: [
          { customer_name: '山田一郎', order_count: '4', total_spent: '20000', avg_order_value: '5000' },
        ],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.topCustomers[0]).toEqual({
        customerName: '山田一郎',
        orderCount: 4,
        totalSpent: 20000,
        avgOrderValue: 5000,
      });
    });

    it('should map customerAnalysis to correct shape', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        repeatCustomers: { new_customers: '7', repeat_customers: '3' },
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.customerAnalysis).toEqual({
        newCustomers: 7,
        repeatCustomers: 3,
      });
    });

    it('should map weekday stats to correct shape', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        weekdayStats: [
          { weekday: '0', order_count: '3', revenue: '15000' },
          { weekday: '6', order_count: '8', revenue: '40000' },
        ],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.weekdayStats[0]).toEqual({ weekday: 0, orderCount: 3, revenue: 15000 });
      expect(data.weekdayStats[1]).toEqual({ weekday: 6, orderCount: 8, revenue: 40000 });
    });

    it('should handle empty result sets gracefully', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb, {
        basicStats: { total_shipped: '0', total_revenue: '0', avg_order_value: '0', unique_customers: '0' },
        dailyTrend: [],
        topCustomers: [],
        repeatCustomers: { new_customers: '0', repeat_customers: '0' },
        weekdayStats: [],
        previousStats: { total_shipped: '0', total_revenue: '0' },
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.dailyTrend).toHaveLength(0);
      expect(data.topCustomers).toHaveLength(0);
      expect(data.weekdayStats).toHaveLength(0);
    });

    it('should call client.end() after successful queries', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      setupStatsMocks(mockDb);

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      await GET(request);

      expect(endSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Database errors
  // ---------------------------------------------------------------------------
  describe('Database errors', () => {
    it('should return 500 when basicStats query fails', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockRejectedValueOnce(new Error('Query timeout'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error_code).toBe('DATABASE_ERROR');
    });

    it('should return 500 when getDbClient throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockGetDbClient.mockRejectedValueOnce(new Error('Pool unavailable'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
    });

    it('should call client.end() even when a query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockRejectedValueOnce(new Error('DB error'));

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      await GET(request);

      expect(endSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('should handle negative growth (revenue decline)', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      // current 30000 vs previous 60000 → -50%
      setupStatsMocks(mockDb, {
        basicStats: { total_shipped: '5', total_revenue: '30000', avg_order_value: '6000', unique_customers: '3' },
        previousStats: { total_shipped: '10', total_revenue: '60000' },
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.revenueGrowth).toBe(-50);
    });

    it('should handle missing repeat customers row gracefully', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total_shipped: '5', total_revenue: '25000', avg_order_value: '5000', unique_customers: '3' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }) // empty repeatCustomers
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_shipped: '3', total_revenue: '15000' }] });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/stats',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customerAnalysis.newCustomers).toBe(0);
      expect(data.customerAnalysis.repeatCustomers).toBe(0);
    });
  });
});
