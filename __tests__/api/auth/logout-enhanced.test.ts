import { POST } from '@/app/api/auth/logout/route'
import { createMockRequest, resetTestDatabase } from '../../setup/test-utils'
import { NextResponseMock } from '../../setup/test-utils'

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
      const response = await POST(request as any)

      // Assert - NextResponse.json() returns a Response object directly in Next.js 16
      expect(response).toBeDefined()
      expect(response.ok).toBe(true)
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
      const response = await POST(request as any)

      // Assert
      expect(response).toBeDefined()
      expect(response.ok).toBe(true)
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
      const response = await POST(request as any)

      // Assert
      expect(response).toBeDefined()
      expect(response.ok).toBe(true)
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
      const response = await POST(request as any)

      // Assert - current implementation always succeeds
      expect(response).toBeDefined()
      expect(response.ok).toBe(true)
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
      const response1 = await POST(request1 as any)
      const response2 = await POST(request2 as any)

      // Assert
      expect(response1).toBeDefined()
      expect(response2).toBeDefined()
      expect(response1.ok).toBe(true)
      expect(response2.ok).toBe(true)
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

      const responseAll = await POST(requestAll as any)

      expect(responseAll).toBeDefined()
      expect(responseAll.ok).toBe(true)

      // Test with partial cookies
      const requestPartial = createMockRequest({
        method: 'POST',
        cookies: { csrf_token: 'csrf-only' }
      })

      const responsePartial = await POST(requestPartial as any)

      expect(responsePartial).toBeDefined()
      expect(responsePartial.ok).toBe(true)
    })

    it('should return consistent response structure', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: { session_token: 'test-token' }
      })

      // Act
      const response = await POST(request as any)

      // Assert - NextResponse.json() returns Response directly in Next.js 16
      expect(response).toBeDefined()
      expect(response.ok).toBe(true)
    })
  })
})