/** @jest-environment node */

// FILE: __tests__/api/shipping/cancel.test.ts

import { POST } from '@/app/api/shipping/cancel/route';
import {
  createMockRequest,
  MockDbClient,
  createMockUser,
  createMockSession,
  createMockOrder,
} from '../../setup/test-utils';

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

describe('/api/shipping/cancel', () => {
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
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        body: { order_ids: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error_code).toBe('INVALID_SESSION');
    });

    it('should return 401 when session token is invalid', async () => {
      mockValidateSession.mockResolvedValueOnce(null as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: { 'x-session-token': 'bad-token' },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error_code).toBe('EXPIRED_SESSION');
    });

    it('should return 401 when session has no user', async () => {
      mockValidateSession.mockResolvedValueOnce({ user: null, session: null } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: { 'x-session-token': 'some-token' },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should accept session token from cookie', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const shippedOrder = { id: 1, order_code: 'ORD-001', status: 'shipped' };
      const cancelledOrder = { id: 1, order_code: 'ORD-001', customer_name: '田中', status: 'pending' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [shippedOrder] })
        .mockResolvedValueOnce({ rows: [cancelledOrder] });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        cookies: { session_token: 'cookie-token' },
        headers: { 'x-csrf-token': 'mock-csrf-token' },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // CSRF validation
  // ---------------------------------------------------------------------------
  describe('CSRF validation', () => {
    it('should return 403 when CSRF token is missing', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: { 'x-session-token': 'valid-token' },
        // No x-csrf-token
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain('CSRF');
    });

    it('should return 403 when CSRF token does not match', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'definitely-wrong-csrf',
        },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------
  describe('Input validation', () => {
    const makeAuthRequest = (mockUser: any, mockSession: any, body: any) => {
      mockValidateSession.mockResolvedValueOnce(mockSession as any);
      return createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body,
      });
    };

    it('should return 400 when order_ids is missing', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      const request = makeAuthRequest(mockUser, mockSession, {});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('注文IDが指定されていません');
    });

    it('should return 400 when order_ids is an empty array', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      const request = makeAuthRequest(mockUser, mockSession, { order_ids: [] });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('注文IDが指定されていません');
    });
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------
  describe('Happy path', () => {
    it('should cancel a single shipped order and return it as pending', async () => {
      const mockUser = createMockUser({ id: 3 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const shippedOrder = { id: 10, order_code: 'ORD-010', status: 'shipped' };
      const cancelledOrder = { id: 10, order_code: 'ORD-010', customer_name: '田中太郎', status: 'pending' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [shippedOrder] })    // verify query
        .mockResolvedValueOnce({ rows: [cancelledOrder] }); // update query

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [10] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('1件');
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].status).toBe('pending');
    });

    it('should cancel multiple shipped orders at once', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const shippedOrders = [
        { id: 1, order_code: 'ORD-001', status: 'shipped' },
        { id: 2, order_code: 'ORD-002', status: 'shipped' },
        { id: 3, order_code: 'ORD-003', status: 'shipped' },
      ];
      const cancelledOrders = shippedOrders.map(o => ({ ...o, customer_name: '顧客', status: 'pending' }));

      mockDb.query
        .mockResolvedValueOnce({ rows: shippedOrders })
        .mockResolvedValueOnce({ rows: cancelledOrders });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1, 2, 3] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('3件');
      expect(data.orders).toHaveLength(3);
    });

    it('should call client.end() after success', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', status: 'shipped' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', customer_name: '顧客', status: 'pending' }] });

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      await POST(request);

      expect(endSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Business rule violations
  // ---------------------------------------------------------------------------
  describe('Business rule violations', () => {
    it('should return 404 when verify query returns fewer rows than requested order_ids', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      // Only 1 row returned for 3 requested IDs → some orders don't belong to user
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', status: 'shipped' }] });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1, 2, 3] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('見つからない');
    });

    it('should return 400 when one or more orders are not in shipped status', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      // Mix of shipped and pending orders
      const mixedOrders = [
        { id: 1, order_code: 'ORD-001', status: 'shipped' },
        { id: 2, order_code: 'ORD-002', status: 'pending' }, // not shipped
      ];
      mockDb.query.mockResolvedValueOnce({ rows: mixedOrders });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('発送済みステータスではない');
      expect(data.non_shipped_orders).toContain('ORD-002');
    });

    it('should include all non-shipped order codes in the error response', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const allPendingOrders = [
        { id: 1, order_code: 'ORD-001', status: 'pending' },
        { id: 2, order_code: 'ORD-002', status: 'pending' },
      ];
      mockDb.query.mockResolvedValueOnce({ rows: allPendingOrders });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1, 2] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.non_shipped_orders).toEqual(expect.arrayContaining(['ORD-001', 'ORD-002']));
    });
  });

  // ---------------------------------------------------------------------------
  // Database errors
  // ---------------------------------------------------------------------------
  describe('Database errors', () => {
    it('should return 500 when verify query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockRejectedValueOnce(new Error('DB connection error'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error_code).toBe('DATABASE_ERROR');
    });

    it('should return 500 when update query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      // verify passes, update fails
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', status: 'shipped' }] })
        .mockRejectedValueOnce(new Error('Update failed'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error_code).toBe('DATABASE_ERROR');
    });

    it('should return 500 when getDbClient throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockGetDbClient.mockRejectedValueOnce(new Error('Pool exhausted'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
    });

    it('should call client.end() even when update query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', status: 'shipped' }] })
        .mockRejectedValueOnce(new Error('Update failed'));

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      await POST(request);

      expect(endSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('should handle a single order ID in the array', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 5, order_code: 'ORD-005', status: 'shipped' }] })
        .mockResolvedValueOnce({ rows: [{ id: 5, order_code: 'ORD-005', customer_name: '顧客', status: 'pending' }] });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [5] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders[0].status).toBe('pending');
    });

    it('should use userId from session (not from request body) for security isolation', async () => {
      const mockUser = createMockUser({ id: 42 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', status: 'shipped' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, order_code: 'ORD-001', customer_name: '顧客', status: 'pending' }] });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/shipping/cancel',
        headers: {
          'x-session-token': 'valid-token',
          'x-csrf-token': 'mock-csrf-token',
        },
        body: { order_ids: [1] },
      });

      await POST(request);

      // Both queries should be called with userId=42
      const firstCallParams = mockDb.query.mock.calls[0][1];
      expect(firstCallParams).toContain('42');
    });
  });
});
