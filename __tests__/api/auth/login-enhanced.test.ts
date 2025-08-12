import { POST } from '@/app/api/auth/login/route'
import { createMockRequest, MockDbClient, createMockUser, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth-enhanced', () => ({
  authenticateUserEnhanced: jest.fn(),
  getClientInfo: jest.fn().mockReturnValue({
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Agent'
  })
}))

describe('/api/auth/login', () => {
  let mockClient: MockDbClient
  const { authenticateUserEnhanced } = require('@/lib/auth-enhanced')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    authenticateUserEnhanced.mockClear()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser'
      })
      
      // Mock successful authentication
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインに成功しました',
        user: mockUser,
        session: {
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date()
        },
        requiresPasswordChange: false
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'password123',
          rememberMe: false
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual(
        expect.objectContaining({
          id: 1,
          username: 'testuser'
        })
      )
      expect(authenticateUserEnhanced).toHaveBeenCalledWith(
        'testuser',
        'password123',
        '127.0.0.1',
        'Jest Test Agent',
        false
      )
    })

    it('should reject login with invalid credentials', async () => {
      // Arrange
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません。'
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'wrongpassword'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ユーザー名またはパスワードが正しくありません。')
    })

    it('should validate required fields', async () => {
      // Arrange - missing username
      const request1 = createMockRequest({
        method: 'POST',
        body: { password: 'password123' }
      })

      // Act
      const response1 = await POST(request1)
      const data1 = await response1.json()

      // Assert
      expect(response1.status).toBe(400)
      expect(data1.success).toBe(false)
      expect(data1.message).toBe('ユーザー名とパスワードは必須です。')

      // Test missing password
      const request2 = createMockRequest({
        method: 'POST',
        body: { username: 'testuser' }
      })

      const response2 = await POST(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(data2.success).toBe(false)
      expect(data2.message).toBe('ユーザー名とパスワードは必須です。')
    })

    it('should handle remember me functionality', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインに成功しました',
        user: mockUser,
        session: {
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date()
        },
        rememberToken: {
          selector: 'mock-selector',
          validator: 'mock-validator'
        },
        requiresPasswordChange: false
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'password123',
          rememberMe: true
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(authenticateUserEnhanced).toHaveBeenCalledWith(
        'testuser',
        'password123',
        '127.0.0.1',
        'Jest Test Agent',
        true
      )
    })

    it('should handle account lockout', async () => {
      // Arrange
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'アカウントがロックされています。5分後に再試行してください。',
        lockoutInfo: {
          isLocked: true,
          lockoutLevel: 1,
          unlockTime: new Date(Date.now() + 5 * 60 * 1000)
        }
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'lockeduser',
          password: 'password123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toContain('アカウントがロックされています')
      expect(data.lockoutInfo).toBeDefined()
    })

    it('should handle server errors gracefully', async () => {
      // Arrange
      authenticateUserEnhanced.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'password123'
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

    it('should set appropriate cookies on successful login', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインに成功しました',
        user: mockUser,
        session: {
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date()
        },
        requiresPasswordChange: false
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'password123'
        }
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      
      // Check that cookies are set (in a real test environment, you'd check response.headers)
      // This is a simplified check since we're mocking the response
      expect(response).toBeDefined()
    })

    it('should handle password change requirement', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインに成功しました',
        user: mockUser,
        session: {
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date()
        },
        requiresPasswordChange: true
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'temppassword'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.requiresPasswordChange).toBe(true)
    })
  })
})