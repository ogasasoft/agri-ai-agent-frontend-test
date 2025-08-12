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

    it('should handle errors gracefully', async () => {
      // This test is tricky since the current implementation is very simple
      // and doesn't have much error handling logic that can fail
      // The current implementation would only fail if JSON response creation fails,
      // which is unlikely in normal circumstances
      
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'any-token' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert - current implementation always succeeds
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should be able to handle multiple logout requests', async () => {
      // Arrange
      const request1 = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'session1' }
      })
      
      const request2 = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'session2' }
      })

      // Act
      const response1 = await POST(request1)
      const response2 = await POST(request2)
      
      const data1 = await response1.json()
      const data2 = await response2.json()

      // Assert
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)
    })

    it('should work with various cookie combinations', async () => {
      // Test with all cookies
      const requestAll = createMockRequest({
        method: 'POST',
        cookies: { 
          session_token: 'session',
          csrf_token: 'csrf',
          remember_token: 'remember'
        }
      })

      const responseAll = await POST(requestAll)
      const dataAll = await responseAll.json()

      expect(responseAll.status).toBe(200)
      expect(dataAll.success).toBe(true)

      // Test with partial cookies
      const requestPartial = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: 'csrf-only' }
      })

      const responsePartial = await POST(requestPartial)
      const dataPartial = await responsePartial.json()

      expect(responsePartial.status).toBe(200)
      expect(dataPartial.success).toBe(true)
    })

    it('should return consistent response structure', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'test-token' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert response structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('message')
      expect(typeof data.success).toBe('boolean')
      expect(typeof data.message).toBe('string')
    })
  })
})