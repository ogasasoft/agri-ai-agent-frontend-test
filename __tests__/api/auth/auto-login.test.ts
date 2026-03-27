/** @jest-environment node */
// FILE: __tests__/api/auth/auto-login.test.ts

import { POST } from '@/app/api/auth/auto-login/route'
import { createMockRequest, MockDbClient, resetTestDatabase } from '../../setup/test-utils'

// Mock auth-enhanced module
jest.mock('@/lib/auth-enhanced', () => ({
  autoLoginWithRememberToken: jest.fn(),
  getClientInfo: jest.fn().mockReturnValue({
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Agent'
  })
}))

describe('/api/auth/auto-login', () => {
  const { autoLoginWithRememberToken, getClientInfo } = require('@/lib/auth-enhanced')

  beforeEach(async () => {
    await resetTestDatabase()
    jest.clearAllMocks()
    getClientInfo.mockReturnValue({
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent'
    })
  })

  describe('POST /api/auth/auto-login', () => {
    it('should return 401 when no remember_token cookie is present', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {}
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Remember tokenが見つかりません。')
      expect(autoLoginWithRememberToken).not.toHaveBeenCalled()
    })

    it('should return 401 when remember_token has invalid format (no colon separator)', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'invalidtoken_without_colon'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('無効なRemember tokenです。')
      expect(autoLoginWithRememberToken).not.toHaveBeenCalled()
    })

    it('should return 401 when remember_token has empty selector (colon at start)', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: ':validatorpart'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('無効なRemember tokenです。')
      expect(autoLoginWithRememberToken).not.toHaveBeenCalled()
    })

    it('should return 401 when remember_token has empty validator (colon at end)', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'selectorpart:'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('無効なRemember tokenです。')
      expect(autoLoginWithRememberToken).not.toHaveBeenCalled()
    })

    it('should return 401 and clear remember_token cookie when autoLoginWithRememberToken fails', async () => {
      // Arrange
      autoLoginWithRememberToken.mockResolvedValue({
        success: false,
        message: 'トークンが無効または期限切れです'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'valid-selector:valid-validator'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('トークンが無効または期限切れです')
      expect(autoLoginWithRememberToken).toHaveBeenCalledWith(
        'valid-selector',
        'valid-validator',
        '127.0.0.1',
        'Jest Test Agent'
      )

      // Verify the remember_token cookie is cleared
      const setCookieHeader = response.headers.get('Set-Cookie')
      expect(setCookieHeader).toContain('remember_token=')
      expect(setCookieHeader).toContain('Max-Age=0')
    })

    it('should return 200 with session cookies on successful auto-login', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      }

      autoLoginWithRememberToken.mockResolvedValue({
        success: true,
        message: '自動ログイン成功',
        user: mockUser,
        session: {
          session_token: 'new-session-token',
          csrf_token: 'new-csrf-token'
        }
        // no rememberToken - token is not renewed
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'my-selector:my-validator'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('自動ログインしました。')
      expect(data.user).toEqual(mockUser)
      expect(autoLoginWithRememberToken).toHaveBeenCalledWith(
        'my-selector',
        'my-validator',
        '127.0.0.1',
        'Jest Test Agent'
      )

      // Verify session and CSRF cookies are set
      const setCookieHeader = response.headers.get('Set-Cookie')
      expect(setCookieHeader).toContain('session_token=new-session-token')
      expect(setCookieHeader).toContain('csrf_token=new-csrf-token')
    })

    it('should set a new remember_token cookie when rememberToken is returned', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      }

      autoLoginWithRememberToken.mockResolvedValue({
        success: true,
        message: '自動ログイン成功',
        user: mockUser,
        session: {
          session_token: 'new-session-token',
          csrf_token: 'new-csrf-token'
        },
        rememberToken: {
          selector: 'new-selector',
          validator: 'new-validator'
        }
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'old-selector:old-validator'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify new remember_token cookie is set with rotated selector:validator value
      const setCookieHeader = response.headers.get('Set-Cookie')
      expect(setCookieHeader).toContain('remember_token=new-selector:new-validator')
    })

    it('should return 500 on unexpected server error', async () => {
      // Arrange
      autoLoginWithRememberToken.mockRejectedValue(new Error('Unexpected database failure'))

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'selector:validator'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('サーバーエラーが発生しました。')
    })

    it('should call getClientInfo to extract IP and user agent', async () => {
      // Arrange
      getClientInfo.mockReturnValue({
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      })

      autoLoginWithRememberToken.mockResolvedValue({
        success: false,
        message: 'token invalid'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          remember_token: 'sel:val'
        }
      })

      // Act
      await POST(request)

      // Assert
      expect(getClientInfo).toHaveBeenCalledWith(request)
      expect(autoLoginWithRememberToken).toHaveBeenCalledWith(
        'sel',
        'val',
        '192.168.1.100',
        'Mozilla/5.0'
      )
    })
  })
})
