import { POST } from '@/app/api/chat/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, resetTestDatabase, createMockAuthHeaders } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

// Mock OpenAI API
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = { ...originalEnv, OPENAI_API_KEY: 'test-openai-key' }
})

afterAll(() => {
  process.env = originalEnv
})

describe('/api/chat', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
    mockFetch.mockClear()
  })

  describe('POST /api/chat', () => {
    it('should process chat message successfully with OpenAI', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token',
        session_token: 'session-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      // Mock successful OpenAI response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'これは農業に関する質問ですね。トマトの栽培についてお答えします。'
            }
          }]
        })
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'トマトの栽培方法について教えてください' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.response).toBe('これは農業に関する質問ですね。トマトの栽培についてお答えします。')

      // Verify OpenAI API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-openai-key',
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('トマトの栽培方法について教えてください')
        })
      )
    })

    it('should require authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' }
        // No auth headers
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.response).toBe('認証が必要です。')
    })

    it('should validate session', async () => {
      // Arrange
      validateSession.mockResolvedValue(null) // Invalid session

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: { 'x-session-token': 'invalid-session' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.response).toBe('セッションが無効です。')
    })

    it('should validate CSRF token', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: {
          'x-session-token': 'session-token',
          'x-csrf-token': 'invalid-csrf-token',
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.response).toBe('CSRF検証に失敗しました。')
    })

    it('should validate message field', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: {}, // Missing message
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.response).toBe('メッセージが必要です。')
    })

    it('should reject empty messages', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: { message: '   ' }, // Empty/whitespace message
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.response).toBe('メッセージが必要です。')
    })

    it('should reject messages that are too long', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const longMessage = 'a'.repeat(4001) // Exceeds 4000 character limit

      const request = createMockRequest({
        method: 'POST',
        body: { message: longMessage },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.response).toBe('メッセージが長すぎます。')
    })

    it('should handle missing OpenAI API key', async () => {
      // Arrange
      process.env.OPENAI_API_KEY = undefined

      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.response).toBe('AI機能が使用できません。')
    })

    it('should handle placeholder API key', async () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'your_openai_api_key_here'

      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.response).toBe('AI機能が使用できません。')
    })

    it('should handle OpenAI API errors', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.response).toBe('AI機能が使用できません。')
    })

    it('should handle OpenAI API with malformed response', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [] // No choices in response
        })
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.response).toBe('AI機能が使用できません。')
    })

    it('should send correct parameters to OpenAI API', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'AI回答' }
          }]
        })
      } as Response)

      const testMessage = 'キュウリの病気について教えてください'
      const request = createMockRequest({
        method: 'POST',
        body: { message: testMessage },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      await POST(request)

      // Assert
      const openaiCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(openaiCall[1].body as string)

      expect(requestBody).toEqual({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: testMessage }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    it('should trim AI response content', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: '  AIからの回答です  \n\n' } // With whitespace
          }]
        })
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(data.response).toBe('AIからの回答です')
    })

    it('should handle network errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.response).toBe('AI機能が使用できません。')
    })

    it('should validate message type', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      const request = createMockRequest({
        method: 'POST',
        body: { message: 123 }, // Non-string message
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.response).toBe('メッセージが必要です。')
    })

    it('should include error details in development environment', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token'
      })

      validateSession.mockResolvedValue({ 
        user: mockUser,
        session: { csrf_token: 'valid-csrf-token' }
      })

      mockFetch.mockRejectedValue(new Error('Specific error message'))

      const request = createMockRequest({
        method: 'POST',
        body: { message: 'テストメッセージ' },
        headers: createMockAuthHeaders('session-token', 'valid-csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Specific error message')

      // Restore environment
      process.env.NODE_ENV = originalEnv
    })
  })
})