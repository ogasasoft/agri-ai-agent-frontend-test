import { GET } from '@/app/api/auth/me/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

describe('/api/auth/me', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid session', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      })

      const mockSession = createMockSession({
        user_id: 1,
        session_token: 'valid-session-token',
        csrf_token: 'csrf-token'
      })

      validateSession.mockResolvedValue({
        user: mockUser,
        session: mockSession
      })

      const request = createMockRequest({
        method: 'GET',
        cookies: {
          session_token: 'valid-session-token'
        }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual(mockUser)
      expect(data.session).toEqual(mockSession)
      expect(validateSession).toHaveBeenCalledWith('valid-session-token')
    })

    it('should return 401 when no session token provided', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET'
        // No session token
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
      expect(validateSession).not.toHaveBeenCalled()
    })

    it('should return 401 when session is invalid', async () => {
      // Arrange
      validateSession.mockResolvedValue(null)

      const request = createMockRequest({
        method: 'GET',
        cookies: {
          session_token: 'invalid-session-token'
        }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('セッションが無効です。')
      expect(validateSession).toHaveBeenCalledWith('invalid-session-token')
    })

    it('should handle session validation errors', async () => {
      // Arrange
      validateSession.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'GET',
        cookies: {
          session_token: 'valid-session-token'
        }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('サーバーエラーが発生しました。')
    })

    it('should include admin flag for super admin users', async () => {
      // Arrange
      const mockAdminUser = createMockUser({
        id: 2,
        username: 'admin',
        email: 'admin@example.com',
        is_super_admin: true
      })

      const mockSession = createMockSession({
        user_id: 2,
        session_token: 'admin-session-token'
      })

      validateSession.mockResolvedValue({
        user: mockAdminUser,
        session: mockSession
      })

      const request = createMockRequest({
        method: 'GET',
        cookies: {
          session_token: 'admin-session-token'
        }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.is_super_admin).toBe(true)
    })

    it('should handle expired sessions', async () => {
      // Arrange - validateSession returns null for expired sessions
      validateSession.mockResolvedValue(null)

      const request = createMockRequest({
        method: 'GET',
        cookies: {
          session_token: 'expired-session-token'
        }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('セッションが無効です。')
    })
  })
})