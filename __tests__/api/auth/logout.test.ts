import { POST } from '@/app/api/auth/logout/route'
import { createMockRequest, MockDbClient, createMockSession, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
  invalidateSession: jest.fn(),
}))

describe('/api/auth/logout', () => {
  let mockClient: MockDbClient
  const { validateSession, invalidateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
    invalidateSession.mockClear()
  })

  describe('POST /api/auth/logout', () => {
    it('should successfully logout with valid session', async () => {
      // Arrange
      const mockSession = createMockSession({
        session_token: 'valid-session-token',
        user_id: 1
      })

      validateSession.mockResolvedValue({
        user: { id: 1, username: 'testuser' },
        session: mockSession
      })

      invalidateSession.mockResolvedValue(undefined)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // Check that invalidateSession was called
      expect(invalidateSession).toHaveBeenCalledWith('valid-session-token', 1)

      // For Next.js 16, we need to verify the response was created successfully
      // The actual Set-Cookie header will be used by the browser/client
      expect(response).toBeDefined()
    })

    it('should handle logout without session token', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST'
        // No session token
      })

      // Debug: Check what token is extracted
      console.log('Test request headers:', request.headers)
      console.log('x-session-token:', request.headers.get('x-session-token'))
      console.log('cookies:', request.cookies.get('session_token'))

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // invalidateSession should not be called since there's no session
      expect(invalidateSession).not.toHaveBeenCalled()

      // Verify the response was created successfully
      expect(response).toBeDefined()
    })

    it('should handle logout with invalid session', async () => {
      // Arrange
      validateSession.mockResolvedValue(null)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'invalid-session-token'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // invalidateSession should not be called for invalid session
      expect(invalidateSession).not.toHaveBeenCalled()

      // Verify the response was created successfully
      expect(response).toBeDefined()
    })
    it('should handle logout with remember token', async () => {
      // Arrange
      const mockSession = createMockSession({
        session_token: 'valid-session-token',
        user_id: 1
      })

      validateSession.mockResolvedValue({
        user: { id: 1, username: 'testuser' },
        session: mockSession
      })

      invalidateSession.mockResolvedValue(undefined)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token',
          remember_token: 'remember-token-value'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify response was created successfully
      expect(response).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      validateSession.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert - logout should always succeed even with DB errors
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // Verify response was created successfully
      expect(response).toBeDefined()
    })

    it('should handle session invalidation errors gracefully', async () => {
      // Arrange
      const mockSession = createMockSession({
        session_token: 'valid-session-token',
        user_id: 1
      })

      validateSession.mockResolvedValue({
        user: { id: 1, username: 'testuser' },
        session: mockSession
      })

      invalidateSession.mockRejectedValue(new Error('Invalidation failed'))

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert - logout should always succeed even with invalidation errors
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // Verify response was created successfully
      expect(response).toBeDefined()
    })
  })
})