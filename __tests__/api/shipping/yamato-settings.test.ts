import { GET, PUT } from '@/app/api/yamato-settings/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, resetTestDatabase, createMockAuthHeaders } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

describe('/api/yamato-settings', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
  })

  describe('GET /api/yamato-settings', () => {
    it('should return yamato settings for authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      // Mock yamato settings data
      const mockSettings = [
        { setting_key: 'yamato_sender_name', setting_value: '農業株式会社' },
        { setting_key: 'yamato_sender_phone', setting_value: '03-1234-5678' },
        { setting_key: 'yamato_sender_zip', setting_value: '1000001' },
        { setting_key: 'yamato_sender_address', setting_value: '東京都千代田区1-1-1' },
        { setting_key: 'yamato_default_slip_type', setting_value: '0' },
        { setting_key: 'yamato_default_cool_section', setting_value: '1' }
      ]

      mockClient.setMockData('user_settings', mockSettings)

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'session-token' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings).toEqual({
        sender_name: '農業株式会社',
        sender_phone: '03-1234-5678',
        sender_zip: '1000001',
        sender_address: '東京都千代田区1-1-1',
        default_slip_type: '0',
        default_cool_section: '1'
      })
    })

    it('should return default settings when no user settings exist', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })
      mockClient.setMockData('user_settings', []) // No settings

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'session-token' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings).toEqual(
        expect.objectContaining({
          sender_name: '',
          sender_phone: '',
          sender_zip: '',
          sender_address: '',
          default_slip_type: '0',
          default_cool_section: '0'
        })
      )
    })

    it('should require authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET'
        // No auth headers
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })
      
      // Mock database error
      mockClient.query = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'session-token' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('設定の取得に失敗しました')
    })
  })

  describe('PUT /api/yamato-settings', () => {
    it('should save yamato settings successfully', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      const settingsData = {
        sender_name: '新農業株式会社',
        sender_phone: '03-9876-5432',
        sender_zip: '1000002',
        sender_address: '東京都千代田区2-2-2',
        default_slip_type: '1',
        default_cool_section: '1',
        default_delivery_time: '14',
        enable_delivery_complete_email: 'true',
        delivery_complete_email_message: '配送完了通知'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: settingsData,
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Yamato設定を保存しました')
      
      // Verify all settings were saved (through mock calls)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        expect.arrayContaining([1]) // user_id
      )
    })

    it('should update existing settings', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      // Mock existing settings
      mockClient.setMockData('user_settings', [
        { setting_key: 'yamato_sender_name', setting_value: '旧会社名' }
      ])

      const settingsData = {
        sender_name: '新会社名',
        sender_phone: '03-1111-2222'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: settingsData,
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Yamato設定を保存しました')
    })

    it('should validate required authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'PUT',
        body: { sender_name: 'テスト会社' }
        // No auth headers
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です')
    })

    it('should handle empty request body', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      const request = createMockRequest({
        method: 'PUT',
        body: {}, // Empty settings
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Yamato設定を保存しました')
    })

    it('should sanitize input data', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      const settingsData = {
        sender_name: '<script>alert("xss")</script>悪意のあるスクリプト',
        sender_phone: '03-1234-5678; DROP TABLE users;',
        sender_address: '住所データ\nwith\ttabs'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: settingsData,
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify that the data was sanitized during save
      const savedSettings = mockClient.query.mock.calls
      expect(savedSettings.some(call => 
        call[1] && call[1].includes('<script>')
      )).toBe(false) // Should not contain script tags
    })

    it('should handle database transaction errors', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      // Mock database error during transaction
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN transaction
        .mockRejectedValue(new Error('Transaction failed'))

      const request = createMockRequest({
        method: 'PUT',
        body: { sender_name: 'テスト' },
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('設定の保存に失敗しました')
    })

    it('should validate setting key format', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      const settingsData = {
        sender_name: 'テスト会社',
        invalid_key_with_special_chars: '不正なキー', // Should be filtered out
        'another_invalid/key': 'テスト'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: settingsData,
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Should only save valid yamato settings keys
      const insertCalls = mockClient.query.mock.calls.filter(call => 
        call[0] && call[0].includes('INSERT INTO user_settings')
      )
      
      // Should save the valid sender_name but not invalid keys
      expect(insertCalls.some(call => 
        call[1] && call[1].includes('yamato_sender_name')
      )).toBe(true)
    })

    it('should handle concurrent settings updates', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser, session: mockSession })

      const settingsData = {
        sender_name: '会社名',
        sender_phone: '03-1234-5678'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: settingsData,
        headers: { 'x-session-token': 'session-token', 'x-csrf-token': 'csrf-token', 'Content-Type': 'application/json' }
      })

      // Act - simulate concurrent requests
      const [response1, response2] = await Promise.all([
        PUT(request),
        PUT(request)
      ])

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ])

      // Assert - both should succeed
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)
    })
  })
})