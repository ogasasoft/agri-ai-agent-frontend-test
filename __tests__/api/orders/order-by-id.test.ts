/** @jest-environment node */

// FILE: __tests__/api/orders/order-by-id.test.ts

import { GET, PUT } from '@/app/api/orders/[id]/route';
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

import { validateSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';

const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>;
const mockGetDbClient = getDbClient as jest.MockedFunction<typeof getDbClient>;

// Helper: build the params object expected by Next.js dynamic route handlers
const makeParams = (id: string) => ({ params: { id } });

describe('/api/orders/[id]', () => {
  let mockDb: MockDbClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = MockDbClient.getInstance();
    mockDb.clearMockData();
    mockGetDbClient.mockResolvedValue(mockDb as any);
  });

  // ===========================================================================
  // GET /api/orders/[id]
  // ===========================================================================
  describe('GET /api/orders/[id]', () => {
    describe('Authentication failures', () => {
      it('should return 401 when no session token is provided', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
        });

        const response = await GET(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.message).toBe('認証が必要です');
      });

      it('should return 401 when session is invalid', async () => {
        mockValidateSession.mockResolvedValueOnce(null as any);

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'bad-token' },
        });

        const response = await GET(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.message).toBe('無効なセッションです');
      });

      it('should return 401 when session has no user', async () => {
        mockValidateSession.mockResolvedValueOnce({ user: null, session: null } as any);

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'some-token' },
        });

        const response = await GET(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
      });

      it('should accept session token from cookie', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const mockOrderRow = createMockOrder({ id: 1, user_id: 1 });
        mockDb.query.mockResolvedValueOnce({ rows: [mockOrderRow] });

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          cookies: { session_token: 'cookie-token' },
        });

        const response = await GET(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });

    describe('Input validation', () => {
      it('should return 400 when order ID is not a valid integer', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/abc',
          headers: { 'x-session-token': 'valid-token' },
        });

        const response = await GET(request, makeParams('abc'));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.message).toBe('無効な注文IDです');
      });

      it('should return 400 when order ID is an empty string', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/',
          headers: { 'x-session-token': 'valid-token' },
        });

        const response = await GET(request, makeParams(''));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
      });
    });

    describe('Happy path', () => {
      it('should return the order when it exists and belongs to the user', async () => {
        const mockUser = createMockUser({ id: 7 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const mockOrderRow = createMockOrder({ id: 42, user_id: 7, status: 'pending' });
        mockDb.query.mockResolvedValueOnce({ rows: [mockOrderRow] });

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/42',
          headers: { 'x-session-token': 'valid-token' },
        });

        const response = await GET(request, makeParams('42'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.order).toBeDefined();
        expect(data.order.id).toBe(42);
      });

      it('should return 404 when the order does not belong to the user', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        // DB returns no rows (order belongs to another user)
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/99',
          headers: { 'x-session-token': 'valid-token' },
        });

        const response = await GET(request, makeParams('99'));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.message).toContain('見つからない');
      });

      it('should call client.end() after success', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockResolvedValueOnce({ rows: [createMockOrder({ id: 1 })] });

        const endSpy = jest.spyOn(mockDb, 'end');

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'valid-token' },
        });

        await GET(request, makeParams('1'));

        expect(endSpy).toHaveBeenCalled();
      });
    });

    describe('Database errors', () => {
      it('should return 500 when database query throws', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce(new Error('Connection lost'));

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'valid-token' },
        });

        const response = await GET(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.message).toContain('取得中にエラー');
        expect(data.error).toBe('Connection lost');
      });

      it('should call client.end() even when query throws', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce(new Error('DB error'));

        const endSpy = jest.spyOn(mockDb, 'end');

        const request = createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'valid-token' },
        });

        await GET(request, makeParams('1'));

        expect(endSpy).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // PUT /api/orders/[id]
  // ===========================================================================
  describe('PUT /api/orders/[id]', () => {
    const validUpdateBody = { status: 'shipped', notes: 'テストメモ' };

    describe('Authentication failures', () => {
      it('should return 401 when no session token is provided', async () => {
        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          body: validUpdateBody,
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.message).toBe('認証が必要です');
      });

      it('should return 401 when session is invalid', async () => {
        mockValidateSession.mockResolvedValueOnce(null as any);

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'bad-token' },
          body: validUpdateBody,
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
      });
    });

    describe('CSRF validation', () => {
      it('should return 403 when CSRF token is missing', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: { 'x-session-token': 'valid-token' },
          // No x-csrf-token header
          body: validUpdateBody,
        });

        const response = await PUT(request, makeParams('1'));
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
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'wrong-csrf-token',
          },
          body: validUpdateBody,
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
      });
    });

    describe('Input validation', () => {
      it('should return 400 when order ID is not a valid integer', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/xyz',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: validUpdateBody,
        });

        const response = await PUT(request, makeParams('xyz'));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.message).toBe('無効な注文IDです');
      });

      it('should return 400 when no updatable fields are provided', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        // Existing order found
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { unknown_field: 'value', another_bad_field: 123 },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.message).toBe('更新するフィールドがありません');
      });
    });

    describe('Happy path', () => {
      it('should update order successfully with valid data', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const existingOrder = { id: 1, status: 'pending' };
        const updatedOrder = createMockOrder({ id: 1, status: 'shipped', notes: 'テスト' });

        mockDb.query
          .mockResolvedValueOnce({ rows: [existingOrder] })   // existence check
          .mockResolvedValueOnce({ rows: [updatedOrder] });   // UPDATE RETURNING

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped', notes: 'テスト' },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('注文情報を更新しました');
        expect(data.order).toBeDefined();
      });

      it('should allow updating all allowed fields at once', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        const existingOrder = { id: 5, status: 'pending' };
        const updatedOrder = createMockOrder({
          id: 5,
          status: 'shipped',
          delivery_date: '2024-04-01',
          notes: 'updated',
          item_name: '新商品',
          price: 9800,
          customer_name: '新顧客',
          phone: '090-9999-9999',
          address: '新住所',
          shipped_at: new Date().toISOString(),
        });

        mockDb.query
          .mockResolvedValueOnce({ rows: [existingOrder] })
          .mockResolvedValueOnce({ rows: [updatedOrder] });

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/5',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: {
            status: 'shipped',
            delivery_date: '2024-04-01',
            notes: 'updated',
            item_name: '新商品',
            price: 9800,
            customer_name: '新顧客',
            phone: '090-9999-9999',
            address: '新住所',
            shipped_at: new Date().toISOString(),
          },
        });

        const response = await PUT(request, makeParams('5'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should return 404 when order does not belong to user', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        // Existence check returns nothing (order belongs to another user)
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/99',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        const response = await PUT(request, makeParams('99'));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.message).toContain('見つからない');
      });

      it('should return 500 when UPDATE returns no rows', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] }) // exists
          .mockResolvedValueOnce({ rows: [] });                             // update returns nothing

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.message).toBe('注文の更新に失敗しました');
      });

      it('should call client.end() after success', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] })
          .mockResolvedValueOnce({ rows: [createMockOrder({ id: 1 })] });

        const endSpy = jest.spyOn(mockDb, 'end');

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        await PUT(request, makeParams('1'));

        expect(endSpy).toHaveBeenCalled();
      });
    });

    describe('Database errors', () => {
      it('should return 500 when existence check query throws', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce(new Error('Connection refused'));

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.message).toContain('更新中にエラー');
        expect(data.error).toBe('Connection refused');
      });

      it('should call client.end() even when query throws', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce(new Error('DB error'));

        const endSpy = jest.spyOn(mockDb, 'end');

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        await PUT(request, makeParams('1'));

        expect(endSpy).toHaveBeenCalled();
      });

      it('should return error message from thrown Error instance', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce(new Error('Detailed DB error'));

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(data.error).toBe('Detailed DB error');
      });

      it('should return Unknown error when non-Error is thrown', async () => {
        const mockUser = createMockUser({ id: 1 });
        const mockSession = createMockSession(mockUser);
        mockValidateSession.mockResolvedValueOnce(mockSession as any);

        mockDb.query.mockRejectedValueOnce('string error');

        const request = createMockRequest({
          method: 'PUT',
          url: 'http://localhost:3000/api/orders/1',
          headers: {
            'x-session-token': 'valid-token',
            'x-csrf-token': 'mock-csrf-token',
          },
          body: { status: 'shipped' },
        });

        const response = await PUT(request, makeParams('1'));
        const data = await response.json();

        expect(data.error).toBe('Unknown error');
      });
    });
  });
});
