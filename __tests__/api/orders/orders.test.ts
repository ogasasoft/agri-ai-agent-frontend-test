import { GET, POST } from '@/app/api/orders/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, createMockOrder, resetTestDatabase, createMockAuthHeaders } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

describe('/api/orders', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
  })

  describe('GET /api/orders', () => {
    it('should return orders for authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSessionData = { user: mockUser }
      const mockOrders = [
        createMockOrder({ id: 1, order_code: 'ORD-001', user_id: 1 }),
        createMockOrder({ id: 2, order_code: 'ORD-002', user_id: 1 }),
      ]

      validateSession.mockResolvedValue(mockSessionData)
      mockClient.setMockData('orders', mockOrders)

      const request = createMockRequest({
        method: 'GET',
        headers: createMockAuthHeaders()
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      // Order comes from mockData, check the actual values
      expect(data[0]).toHaveProperty('order_number')
      expect(data[1]).toHaveProperty('order_number')
    })

    it('should return 401 without valid session', async () => {
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
      expect(data.message).toBe('認証が必要です。')
    })

    it('should handle super admin restriction', async () => {
      // Arrange
      const mockSuperAdmin = createMockUser({ id: 1, is_super_admin: true })
      const mockSessionData = { user: mockSuperAdmin }

      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'GET',
        headers: createMockAuthHeaders()
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toContain('管理者アカウント')
    })

    it('should return empty array on database error', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSessionData = { user: mockUser }

      validateSession.mockResolvedValue(mockSessionData)
      mockClient.setMockError(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'GET',
        headers: createMockAuthHeaders()
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })
  })

  describe('POST /api/orders', () => {
    it('should create new order with valid data', async () => {
      // Arrange  
      const orderData = {
        order_code: 'ORD-003',
        customer_name: '山田太郎',
        phone: '090-1234-5678',
        address: '東京都新宿区1-1-1',
        price: 5000,
        order_date: '2024-01-15',
        delivery_date: '2024-01-17',
        notes: 'テスト注文'
      }

      const request = createMockRequest({
        method: 'POST',
        body: orderData,
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toEqual(
        expect.objectContaining({
          id: 1,
          order_number: 'ORD-003',
          customer_name_masked: '山田太郎',
          total_amount: 5000,
          status: 'pending',
          has_memo: true
        })
      )
    })

    it('should require user authentication', async () => {
      // Arrange
      const orderData = {
        customer_name: '山田太郎'
      }

      const request = createMockRequest({
        method: 'POST',
        body: orderData
        // No x-user-id header
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
    })

    it('should validate category ownership', async () => {
      // Arrange
      const orderData = {
        order_code: 'ORD-003',
        customer_name: '山田太郎',
        category_id: 999 // Invalid category
      }

      mockClient.setMockData('categories', []) // No categories found

      const request = createMockRequest({
        method: 'POST',
        body: orderData,
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('指定されたカテゴリが見つかりません。')
    })

    it('should handle database errors', async () => {
      // Arrange
      const orderData = {
        order_code: 'ORD-003',
        customer_name: '山田太郎'
      }

      mockClient.setMockError(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'POST',
        body: orderData,
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('データベースエラーが発生しました。')
    })

    it('should create order with category', async () => {
      // Arrange
      const orderData = {
        order_code: 'ORD-004',
        customer_name: '山田太郎',
        category_id: 1
      }

      mockClient.setMockData('categories', [
        { id: 1, name: 'テストカテゴリ', user_id: 1 }
      ])

      const request = createMockRequest({
        method: 'POST',
        body: orderData,
        headers: {
          'x-user-id': '1',
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toEqual(
        expect.objectContaining({
          id: 1,
          order_number: 'ORD-004',
          customer_name_masked: '山田太郎',
          status: 'pending'
        })
      )
    })
  })
})