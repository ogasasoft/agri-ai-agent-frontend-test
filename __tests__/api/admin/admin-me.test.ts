import { GET } from '@/app/api/admin/me/route'
import { createMockRequest, MockDbClient, createMockUser, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
}))

describe('/api/admin/me', () => {
  let mockClient: MockDbClient
  const { validateAdminSession } = require('@/lib/admin-auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateAdminSession.mockClear()
  })

  describe('GET /api/admin/me', () => {
    it('should return admin user for valid session', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 1, 
        username: 'admin',
        email: 'admin@example.com',
        is_super_admin: true
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual(
        expect.objectContaining({
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          is_super_admin: true
        })
      )
    })

    it('should return admin user for regular admin', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 2, 
        username: 'moderator',
        email: 'mod@example.com',
        is_super_admin: false
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-mod-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toEqual(
        expect.objectContaining({
          id: 2,
          username: 'moderator',
          email: 'mod@example.com',
          is_super_admin: false
        })
      )
    })

    it('should require session token in headers', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET'
        // No session token headers
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
    })

    it('should accept session token from cookies', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 1, 
        username: 'admin',
        is_super_admin: true
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-session-token' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.id).toBe(1)
    })

    it('should reject invalid admin session', async () => {
      // Arrange
      validateAdminSession.mockResolvedValue(null) // Invalid session

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'invalid-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('管理者権限が必要です。')
    })

    it('should reject non-admin user session', async () => {
      // Arrange
      validateAdminSession.mockResolvedValue(null) // Non-admin user returns null

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'regular-user-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('管理者権限が必要です。')
    })

    it('should handle database/validation errors gracefully', async () => {
      // Arrange
      validateAdminSession.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('サーバーエラーが発生しました。')
    })

    it('should handle expired session tokens', async () => {
      // Arrange
      validateAdminSession.mockResolvedValue(null) // Expired session

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'expired-session-token' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('管理者権限が必要です。')
    })

    it('should call validateAdminSession with correct session token', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const sessionToken = 'test-session-token'
      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': sessionToken }
      })

      // Act
      await GET(request)

      // Assert
      expect(validateAdminSession).toHaveBeenCalledWith(sessionToken)
      expect(validateAdminSession).toHaveBeenCalledTimes(1)
    })

    it('should prioritize header token over cookie token', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const headerToken = 'header-session-token'
      const cookieToken = 'cookie-session-token'

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': headerToken },
        cookies: { session_token: cookieToken }
      })

      // Act
      await GET(request)

      // Assert
      expect(validateAdminSession).toHaveBeenCalledWith(headerToken)
      expect(validateAdminSession).not.toHaveBeenCalledWith(cookieToken)
    })

    it('should return user data without sensitive fields', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        is_super_admin: true
        // password_hash should be excluded by validateAdminSession
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'valid-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.user).not.toHaveProperty('password_hash')
      expect(data.user).toHaveProperty('username')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('is_super_admin')
    })
  })
})