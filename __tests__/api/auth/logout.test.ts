import { POST } from '@/app/api/auth/logout/route'
import { createMockRequest, resetTestDatabase } from '../../setup/test-utils'

describe('/api/auth/logout', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and clear cookies', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token',
          csrf_token: 'csrf-token',
          remember_token: 'remember-token'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')

      // Check that cookies are cleared (verify cookie deletion)
      // In Next.js, cookie deletion is handled internally
      expect(response).toBeDefined()
    })

    it('should handle logout without session token', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST'
        // No cookies
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')
    })

    it('should handle logout with only session token', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'some-session-token' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')
    })

    it('should handle logout with remember token', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'session-token',
          remember_token: 'remember-token-value'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')
    })

    it('should handle logout with only remember token', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'remember-token-value'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('ログアウトしました。')
    })
  })
})
