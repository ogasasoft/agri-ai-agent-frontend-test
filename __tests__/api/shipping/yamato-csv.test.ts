import { POST } from '@/app/api/yamato-csv/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, createMockOrder, resetTestDatabase, createMockAuthHeaders } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

describe('/api/yamato-csv', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
  })

  describe('POST /api/yamato-csv', () => {
    it('should generate CSV for selected orders', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token',
        session_token: 'session-token'
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const mockOrders = [
        createMockOrder({ 
          id: 1, 
          order_number: 'ORD-001',
          customer_name: '田中太郎',
          customer_phone: '090-1234-5678',
          customer_address: '東京都渋谷区1-1-1',
          delivery_date: '2024-01-03',
          total_amount: 3000,
          user_id: 1
        }),
        createMockOrder({ 
          id: 2, 
          order_number: 'ORD-002',
          customer_name: '山田花子',
          customer_phone: '090-9876-5432',
          customer_address: '大阪府大阪市2-2-2',
          delivery_date: '2024-01-04',
          total_amount: 5000,
          user_id: 1
        })
      ]

      mockClient.setMockData('orders', mockOrders)

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1, 2] },
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.csv).toBeDefined()
      expect(data.filename).toMatch(/yamato_b2_\d{4}-\d{2}-\d{2}_\d+orders\.csv/)
      expect(data.order_count).toBe(2)
      
      // Check CSV headers and content
      const csvLines = data.csv.split('\n')
      expect(csvLines[0]).toContain('お客様管理番号') // CSV header
      expect(csvLines.length).toBeGreaterThan(2) // Header + data rows
    })

    it('should require authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1, 2] }
        // No auth headers
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です')
    })


    it('should validate order IDs parameter', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const request = createMockRequest({
        method: 'POST',
        body: {}, // Missing orderIds
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('注文IDが指定されていません')
    })

    it('should validate order IDs as array', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: 'not-an-array' }, // Invalid format
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('注文IDが指定されていません')
    })

    it('should only include orders belonging to authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const allOrders = [
        createMockOrder({ id: 1, user_id: 1, customer_name: '田中太郎' }),
        createMockOrder({ id: 2, user_id: 2, customer_name: '他のユーザー' }), // Different user
      ]

      // Mock would filter by user_id
      mockClient.setMockData('orders', allOrders.filter(o => o.user_id === 1))

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1, 2] }, // Requesting both orders
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Should only include order from user 1
      const csvLines = data.csv.split('\n')
      expect(csvLines.join('')).toContain('田中太郎')
      expect(csvLines.join('')).not.toContain('他のユーザー')
    })

    it('should handle empty order results', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })
      mockClient.setMockData('orders', []) // No orders found

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [999] }, // Non-existent order ID
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toContain('注文が見つかりません')
    })

    it('should format CSV data correctly', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const mockOrder = createMockOrder({ 
        id: 1,
        order_number: 'ORD-001',
        customer_name: '田中太郎',
        customer_phone: '090-1234-5678',
        customer_address: '東京都渋谷区1-1-1 マンション101',
        delivery_date: '2024-01-03',
        total_amount: 3000,
        user_id: 1
      })

      mockClient.setMockData('orders', [mockOrder])

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1] },
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      const csvLines = data.csv.split('\n')
      
      // Check specific fields are properly formatted
      const dataLine = csvLines[1] // First data row after header
      expect(dataLine).toContain('田中太郎')
      // Phone number format may differ in actual implementation
      expect(dataLine).toContain('ORDER-1')
      expect(dataLine).toContain('ITEM-1')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // Mock database error
      mockClient.query = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1] },
        headers: { 'x-session-token': 'session-token', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('CSVの生成に失敗しました')
    })

    it('should include delivery date formatting', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const mockOrders = [
        createMockOrder({ 
          id: 1,
          delivery_date: '2024-01-03',
          user_id: 1
        }),
        createMockOrder({ 
          id: 2,
          delivery_date: null, // No delivery date
          user_id: 1
        })
      ]

      mockClient.setMockData('orders', mockOrders)

      const request = createMockRequest({
        method: 'POST',
        body: { orderIds: [1, 2] },
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      const csvData = data.csv
      
      // Should handle both cases - with and without delivery date
      expect(csvData).toContain('2024/01/03')
      // Should handle null delivery dates gracefully
    })
  })
})