import { POST } from '@/app/api/auth/login/route'
import { createMockRequest, MockDbClient, createMockUser, resetTestDatabase } from '../../setup/test-utils'
import { authenticateUserEnhanced, checkRateLimit } from '@/lib/auth-enhanced'

// Mock dependencies - must be at the top
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(async () => MockDbClient.getInstance())
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn()
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const mockResponse = {
        json: async () => data,
        status: options?.status || 200,
        headers: new Map(),
        cookies: {
          set: jest.fn(),
          get: jest.fn(),
          delete: jest.fn()
        }
      };
      // Set default headers
      mockResponse.headers.set('content-type', 'application/json');
      return mockResponse;
    })
  }
}))

import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Mock authenticateUserEnhanced to return success
const mockAuthEnhanced = jest.spyOn(require('@/lib/auth-enhanced'), 'authenticateUserEnhanced').mockImplementation()

describe('/api/auth/login', () => {
  let mockClient: MockDbClient

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    mockAuthEnhanced.mockClear()
    // Setup bcrypt mock to return true for tests
    bcrypt.compare.mockResolvedValue(true)
    bcrypt.hash.mockResolvedValue('hashed-password')
    bcrypt.genSalt.mockResolvedValue('salt')
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)
      mockAuthEnhanced.mockResolvedValue({
        success: true,
        message: 'ログイン成功しました',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          is_active: true,
          is_super_admin: false,
          created_at: '2024-01-01T00:00:00Z'
        },
        session: {
          user_id: 1,
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        },
        rememberToken: undefined,
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
      expect(data.session).toEqual(
        expect.objectContaining({
          user_id: 1,
          session_token: expect.any(String),
          csrf_token: expect.any(String)
        })
      )
    })

    it('should reject login with invalid username', async () => {
      // Arrange
      mockClient.setMockData('users', [])
      mockAuthEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
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
      expect(data.message).toContain('ユーザー名またはパスワードが正しくありません')
    })

    it('should reject login with invalid password', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })

      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(false)
      mockAuthEnhanced.mockResolvedValue({
        success: false,
        message: 'ユーザー名またはパスワードが正しくありません'
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
      expect(data.message).toContain('ユーザー名またはパスワードが正しくありません')
    })

    it('should reject login for inactive user', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        is_active: false
      })

      mockClient.setMockData('users', [mockUser])
      mockAuthEnhanced.mockResolvedValue({
        success: false,
        message: 'アカウントが無効になっています。管理者にお問い合わせください。'
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
      expect(data.message).toContain('ユーザー名またはパスワードが正しくありません')
    })

    it('should reject login for locked user', async () => {
      // Arrange
      const futureTime = new Date(Date.now() + 60000).toISOString() // 1 minute in future
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        is_active: true,
        failed_login_attempts: 5,
        locked_until: futureTime
      })

      mockClient.setMockData('users', [mockUser])
      mockAuthEnhanced.mockResolvedValue({
        success: false,
        message: 'アカウントがロックされています。しばらく時間をおいてから再試行してください。',
        lockoutInfo: {
          level: 3,
          unlockTime: new Date(futureTime)
        }
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
      expect(response.status).toBe(423)
      expect(data.success).toBe(false)
      expect(data.message).toContain('アカウント')
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

      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)
      mockAuthEnhanced.mockResolvedValue({
        success: true,
        message: 'ログイン成功しました',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          is_active: true,
          is_super_admin: false,
          created_at: '2024-01-01T00:00:00Z'
        },
        session: {
          user_id: 1,
          session_token: 'mock-session-token',
          csrf_token: 'mock-csrf-token',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        },
        rememberToken: {
          selector: 'test-selector',
          validator: 'test-validator'
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
      expect(data.rememberToken).toEqual(
        expect.objectContaining({
          selector: expect.any(String),
          validator: expect.any(String)
        })
      )

      // Check that cookies were set
      expect(response.cookies.set).toHaveBeenCalledWith(
        'remember_token',
        expect.stringContaining(':'),
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60,
          path: '/'
        })
      )
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

      mockClient.setMockData('users', [mockUser])

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