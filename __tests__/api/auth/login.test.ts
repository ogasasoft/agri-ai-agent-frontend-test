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
        username: 'testuser',
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })
      
      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)

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
        password_hash: 'hashed-password',
        is_active: true,
        failed_login_attempts: 0
      })
      
      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(false)

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
      const mockUser = createMockUser({
        id: 1,
        username: 'testuser',
        is_active: false
      })
      
      mockClient.setMockData('users', [mockUser])

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
      expect(data.message).toBe('アカウントが無効化されています。')
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
      
      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)

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
          token: expect.any(String),
          selector: expect.any(String)
        })
      )
      
      // Check Set-Cookie header for remember token
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
      
      mockClient.setMockData('users', [mockUser])
      bcrypt.compare.mockResolvedValue(true)

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