/** @jest-environment node */

// FILE: __tests__/api/customers/customers-route.test.ts

import { GET, POST } from '@/app/api/customers/route';
import { createMockRequest, createMockUser, createMockSession } from '../../setup/test-utils';

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}));

import { validateSession } from '@/lib/auth';
const mockValidateSession = validateSession as jest.MockedFunction<typeof validateSession>;

describe('/api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // GET /api/customers
  // ---------------------------------------------------------------------------
  describe('GET /api/customers', () => {
    it('should return mock customer list without authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.customers)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(typeof data.limit).toBe('number');
      expect(typeof data.offset).toBe('number');
    });

    it('should return default pagination values when no params given', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should respect limit and offset query parameters', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers?limit=10&offset=5',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(5);
    });

    it('should filter customers by name when search param is provided', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers?search=%E7%94%B0%E4%B8%AD',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The mock data has "田中太郎" which contains "田中"
      expect(data.customers.length).toBeGreaterThan(0);
    });

    it('should filter customers by order code when search param matches', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers?search=ORD-001',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.customers.length).toBeGreaterThan(0);
    });

    it('should return empty customers array when search matches nothing', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers?search=NOMATCH_XYZ_12345',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.customers).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it('should apply pagination via offset slicing', async () => {
      // offset=100 should return empty since mock data has only 1 customer
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers?offset=100',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customers).toHaveLength(0);
    });

    it('should include registered_at in customer objects', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/customers',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.customers.length > 0) {
        expect(data.customers[0]).toHaveProperty('registered_at');
        expect(data.customers[0]).toHaveProperty('customer_name');
        expect(data.customers[0]).toHaveProperty('order_code');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/customers
  // ---------------------------------------------------------------------------
  describe('POST /api/customers', () => {
    const validCustomers = [
      {
        order_code: 'ORD-001',
        customer_name: '田中太郎',
        customer_phone: '090-1234-5678',
        customer_address: '東京都渋谷区',
      },
    ];

    it('should return 401 when session token is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('認証が必要です');
    });

    it('should return 401 when session token is invalid', async () => {
      mockValidateSession.mockResolvedValueOnce(null as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'invalid-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('セッションが無効です');
    });

    it('should return 401 when session has no user', async () => {
      mockValidateSession.mockResolvedValueOnce({ user: null, session: null } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'some-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customers array is missing', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('顧客データが指定されていません');
    });

    it('should return 400 when customers array is empty', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: [] },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('顧客データが指定されていません');
    });

    it('should successfully register customers with valid session and data', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.inserted).toBe(1);
      expect(data.message).toContain('1件');
      expect(Array.isArray(data.customers)).toBe(true);
      expect(data.customers[0]).toHaveProperty('registered_at');
    });

    it('should register multiple customers and report correct count', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const multipleCustomers = [
        { order_code: 'ORD-001', customer_name: '田中太郎', customer_phone: '090-1111-1111', customer_address: '東京都' },
        { order_code: 'ORD-002', customer_name: '鈴木花子', customer_phone: '090-2222-2222', customer_address: '大阪府' },
        { order_code: 'ORD-003', customer_name: '佐藤次郎', customer_phone: '090-3333-3333', customer_address: '愛知県' },
      ];

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: multipleCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.inserted).toBe(3);
      expect(data.message).toContain('3件');
      expect(data.customers).toHaveLength(3);
    });

    it('should add registered_at timestamp to each returned customer', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: validCustomers },
      });

      const before = Date.now();
      const response = await POST(request);
      const after = Date.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      const registeredAt = new Date(data.customers[0].registered_at).getTime();
      expect(registeredAt).toBeGreaterThanOrEqual(before);
      expect(registeredAt).toBeLessThanOrEqual(after + 100);
    });

    it('should accept session token from cookie', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        cookies: { session_token: 'cookie-session-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 when validateSession throws an error', async () => {
      mockValidateSession.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Database connection failed');
    });

    it('should return 500 with generic message when non-Error is thrown', async () => {
      mockValidateSession.mockRejectedValueOnce('string error');

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/customers',
        headers: { 'x-session-token': 'valid-token' },
        body: { customers: validCustomers },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('顧客情報の登録中にエラーが発生しました');
    });
  });
});
