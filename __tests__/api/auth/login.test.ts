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

jest.mock('@/lib/auth-error-details', () => {
  const MockAuthErrorBuilder = Object.assign(
    jest.fn().mockImplementation((message: string) => ({
      message,
      setAuthContext: jest.fn().mockReturnThis(),
      addProcessingStep: jest.fn().mockReturnThis(),
      addSuggestion: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        success: false,
        message,
        details: {},
        suggestions: [],
        debug_info: {},
        processing_steps: [],
      })
    })),
    {
      loginFailure: jest.fn().mockImplementation(
        (_username: string, reason: string) => ({
          success: false,
          message: reason === 'ACCOUNT_LOCKED'
            ? 'アカウントがロックされています。'
            : 'ユーザー名またはパスワードが正しくありません。',
        })
      ),
      sessionError: jest.fn().mockReturnValue({
        success: false,
        message: 'セッションが無効です',
      })
    }
  )

  return {
    AuthErrorBuilder: MockAuthErrorBuilder,
    logAuthAttempt: jest.fn(),
    logSecurityEvent: jest.fn()
  }
})

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn()
}))

const bcrypt = require('bcryptjs')

describe('/api/auth/login', () => {
  let mockClient: MockDbClient
  const { authenticateUserEnhanced, getClientInfo } = require('@/lib/auth-enhanced')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    authenticateUserEnhanced.mockClear()
    getClientInfo.mockClear()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)

      // Mock successful authentication
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインしました。',
        user: mockUser,
        session: {
          id: 1,
          user_id: 1,
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date().toISOString(),
          is_active: true
        },
        requiresPasswordChange: false,
        rememberToken: undefined
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
      // Session data is set as HTTP-only cookies, not returned in response body
    })

    it('should reject login with invalid username', async () => {
      // Arrange
      mockClient.setMockData('users', [])

      // Mock user not found
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが間違っています。',
        user: undefined,
        session: undefined,
        requiresPasswordChange: false
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'nonexistent',
          password: 'password123'
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

    it('should reject login with invalid password', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      mockClient.setMockData('users', [mockUser])

      // Mock failed authentication
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが間違っています。',
        user: undefined,
        session: undefined,
        requiresPasswordChange: false
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

    it('should reject login for inactive user', async () => {
      // Arrange
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが間違っています。',
        user: undefined,
        session: undefined,
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
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ユーザー名またはパスワードが正しくありません。')
    })

    it('should reject login for locked user', async () => {
      // Arrange
      authenticateUserEnhanced.mockResolvedValue({
        success: false,
        message: 'アカウントがロックされています。5分後に再試行してください。',
        user: undefined,
        session: undefined,
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
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toContain('アカウントがロックされています')
    })

    it('should handle remember me functionality', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインしました。',
        user: mockUser,
        session: {
          id: 1,
          user_id: 1,
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date().toISOString(),
          is_active: true
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

      // rememberToken is set as an HTTP-only cookie, not returned in response body
      const setCookieHeader = response.headers.get('Set-Cookie')
      expect(setCookieHeader).toContain('remember_token=')
    })

    it('should validate required fields', async () => {
      // Test missing username
      const request1 = createMockRequest({
        method: 'POST',
        body: {
          password: 'password123'
        }
      })

      const response1 = await POST(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(400)
      expect(data1.success).toBe(false)
      expect(data1.message).toBe('ユーザー名とパスワードは必須です。')

      // Test missing password
      const request2 = createMockRequest({
        method: 'POST',
        body: {
          username: 'testuser'
        }
      })

      const response2 = await POST(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(400)
      expect(data2.success).toBe(false)
      expect(data2.message).toBe('ユーザー名とパスワードは必須です。')
    })

    it('should handle email login', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      // Mock successful authentication with email
      authenticateUserEnhanced.mockResolvedValue({
        success: true,
        message: 'ログインしました。',
        user: mockUser,
        session: {
          id: 1,
          user_id: 1,
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date().toISOString(),
          is_active: true
        },
        requiresPasswordChange: false
      })

      const request = createMockRequest({
        method: 'POST',
        body: {
          username: 'test@example.com', // Using email as username
          password: 'password123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('test@example.com')
    })
  })
})