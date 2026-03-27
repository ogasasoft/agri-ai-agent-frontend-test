/** @jest-environment node */

// FILE: __tests__/api/dashboard/latest-date.test.ts

import { GET } from '@/app/api/dashboard/latest-date/route';
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

describe('/api/dashboard/latest-date', () => {
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
        url: 'http://localhost:3000/api/dashboard/latest-date',
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
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'invalid-token' },
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
        url: 'http://localhost:3000/api/dashboard/latest-date',
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
    it('should return the latest shipped order date when orders exist', async () => {
      const mockUser = createMockUser({ id: 42 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ latest_date: '2024-03-15T00:00:00.000Z' }],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.latestDate).toBe('2024-03-15');
    });

    it('should return today\'s date as fallback when no shipped orders exist', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ latest_date: null }],
      });

      const todayStr = new Date().toISOString().split('T')[0];

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.latestDate).toBe(todayStr);
    });

    it('should return today\'s date when query returns empty rows', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const todayStr = new Date().toISOString().split('T')[0];

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.latestDate).toBe(todayStr);
    });

    it('should accept session token from cookie', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ latest_date: '2024-06-01T00:00:00.000Z' }],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        cookies: { session_token: 'cookie-session-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should call client.end() after successful query', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ latest_date: '2024-03-01T00:00:00.000Z' }],
      });

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      await GET(request);

      expect(endSpy).toHaveBeenCalled();
    });

    it('should query orders scoped to the authenticated user\'s id', async () => {
      const mockUser = createMockUser({ id: 99 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({ rows: [{ latest_date: null }] });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      await GET(request);

      const queryCall = mockDb.query.mock.calls[0];
      // The second parameter array should contain the userId
      expect(queryCall[1]).toContain('99');
    });

    it('should return date in YYYY-MM-DD format', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ latest_date: '2024-12-31T23:59:59.999Z' }],
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.latestDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ---------------------------------------------------------------------------
  // Database errors
  // ---------------------------------------------------------------------------
  describe('Database errors', () => {
    it('should return 500 when database query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockRejectedValueOnce(new Error('Connection refused'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error_code).toBe('DATABASE_ERROR');
    });

    it('should return 500 when getDbClient itself throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockGetDbClient.mockRejectedValueOnce(new Error('Pool exhausted'));

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
    });

    it('should call client.end() even when query throws', async () => {
      const mockUser = createMockUser({ id: 1 });
      const mockSession = createMockSession(mockUser);
      mockValidateSession.mockResolvedValueOnce(mockSession as any);

      mockDb.query.mockRejectedValueOnce(new Error('Query failed'));

      const endSpy = jest.spyOn(mockDb, 'end');

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/dashboard/latest-date',
        headers: { 'x-session-token': 'valid-token' },
      });

      await GET(request);

      expect(endSpy).toHaveBeenCalled();
    });
  });
});
