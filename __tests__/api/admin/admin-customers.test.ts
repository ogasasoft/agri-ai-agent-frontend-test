import { GET, POST } from '@/app/api/admin/customers/route'
import { createMockRequest, MockDbClient, createMockUser, createMockOrder, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
  logAdminAction: jest.fn(),
  getClientInfo: jest.fn().mockReturnValue({
    ipAddress: '127.0.0.1',
    userAgent: 'Jest Test Agent'
  })
}))

describe('/api/admin/customers', () => {
  let mockClient: MockDbClient
  const { validateAdminSession, logAdminAction } = require('@/lib/admin-auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateAdminSession.mockClear()
    logAdminAction.mockClear()
  })

  describe('GET /api/admin/customers', () => {
    it('should return all customers with statistics for admin', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const mockCustomerData = [
        {
          customer_name: '田中太郎',
          phone: '090-1234-5678',
          address: '東京都渋谷区1-1-1',
          user_id: 2,
          username: 'farmer1',
          id: 1,
          total_orders: '3',
          total_spent: '15000',
          last_order_date: '2024-01-15',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          customer_name: '山田花子',
          phone: '090-9876-5432',
          address: '大阪府大阪市2-2-2',
          user_id: 3,
          username: 'farmer2',
          id: 2,
          total_orders: '2',
          total_spent: '8000',
          last_order_date: '2024-01-10',
          created_at: '2024-01-02T00:00:00Z'
        }
      ]

      mockClient.query = jest.fn().mockResolvedValue({
        rows: mockCustomerData
      })

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.customers).toHaveLength(2)
      expect(data.customers[0]).toEqual(
        expect.objectContaining({
          customer_name: '田中太郎',
          phone: '090-1234-5678',
          total_orders: '3',
          total_spent: '15000',
          username: 'farmer1'
        })
      )
      
      // Verify the query includes user join and statistics
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users u ON o.user_id = u.id')
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(o.id) as total_orders')
      )
      
      // Verify admin action was logged
      expect(logAdminAction).toHaveBeenCalledWith(
        1,
        'view_customers',
        'customer',
        undefined,
        { total_customers: 2 },
        '127.0.0.1',
        'Jest Test Agent'
      )
    })

    it('should return empty array when no customers exist', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn().mockResolvedValue({ rows: [] })

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.customers).toEqual([])
      
      // Should still log the action
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.any(Number),
        'view_customers',
        'customer',
        undefined,
        { total_customers: 0 },
        '127.0.0.1',
        'Jest Test Agent'
      )
    })

    it('should require admin authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET'
        // No session token
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
      expect(logAdminAction).not.toHaveBeenCalled()
    })

    it('should reject non-admin users', async () => {
      // Arrange
      validateAdminSession.mockResolvedValue(null)

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
      expect(logAdminAction).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('サーバーエラーが発生しました。')
    })

    it('should group customers by name and phone correctly', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      await GET(request)

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY o.customer_name, o.phone, o.address, o.user_id, u.username')
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY MIN(o.created_at) DESC')
      )
    })
  })

  describe('POST /api/admin/customers', () => {
    it('should create new customer successfully', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock user exists check
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // User exists
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // Insert result

      const customerData = {
        customer_name: '新規顧客',
        phone: '090-1111-2222',
        address: '新住所',
        email: 'new@customer.com',
        user_id: 2
      }

      const request = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('顧客を作成しました。')
      expect(data.customer_id).toBe(100)

      // Verify user check query
      expect(mockClient.query).toHaveBeenNthCalledWith(1,
        'SELECT id FROM users WHERE id = $1',
        [2]
      )

      // Verify insert query
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO orders'),
        expect.arrayContaining([
          expect.stringMatching(/^ADMIN-\d+$/),
          '新規顧客',
          '090-1111-2222',
          '新住所',
          0,
          expect.any(String),
          2,
          'admin_created',
          '管理者により手動作成された顧客データ',
          expect.stringContaining('created_by_admin')
        ])
      )

      // Verify admin action logged
      expect(logAdminAction).toHaveBeenCalledWith(
        1,
        'create_customer',
        'customer',
        '100',
        customerData,
        '127.0.0.1',
        'Jest Test Agent'
      )
    })

    it('should validate required fields', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const incompleteData = {
        phone: '090-1111-2222'
        // Missing customer_name and user_id
      }

      const request = createMockRequest({
        method: 'POST',
        body: incompleteData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('顧客名とユーザーIDは必須です。')
      expect(logAdminAction).not.toHaveBeenCalled()
    })

    it('should validate user exists', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock user does not exist
      mockClient.query = jest.fn().mockResolvedValue({ rows: [] })

      const customerData = {
        customer_name: '新規顧客',
        user_id: 999 // Non-existent user
      }

      const request = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('指定されたユーザーが見つかりません。')
      expect(logAdminAction).not.toHaveBeenCalled()
    })

    it('should handle optional fields correctly', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // User exists
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // Insert result

      const minimalCustomerData = {
        customer_name: '最小顧客',
        user_id: 2
        // No phone, address, or email
      }

      const request = createMockRequest({
        method: 'POST',
        body: minimalCustomerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify empty strings are used for optional fields
      expect(mockClient.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO orders'),
        expect.arrayContaining([
          expect.any(String), // order_code
          '最小顧客', // customer_name
          '', // phone (empty string)
          '', // address (empty string)
          0, // price
          expect.any(String), // order_date
          2, // user_id
          'admin_created', // source
          '管理者により手動作成された顧客データ', // notes
          expect.stringContaining('created_by_admin') // extra_data
        ])
      )
    })

    it('should generate unique order codes', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValue({ rows: [{ id: 2 }] }) // Always success
        .mockResolvedValue({ rows: [{ id: 100 }] })

      const customerData = {
        customer_name: 'テスト顧客',
        user_id: 2
      }

      const request1 = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      const request2 = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      await POST(request1)
      await new Promise(resolve => setTimeout(resolve, 1)) // Ensure different timestamps
      await POST(request2)

      // Assert
      const orderCode1 = mockClient.query.mock.calls[1][1][0] // First insert call, order_code param
      const orderCode2 = mockClient.query.mock.calls[3][1][0] // Second insert call, order_code param

      expect(orderCode1).toMatch(/^ADMIN-\d+$/)
      expect(orderCode2).toMatch(/^ADMIN-\d+$/)
      expect(orderCode1).not.toBe(orderCode2) // Should be different
    })

    it('should include admin ID in extra_data', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 5, is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 100 }] })

      const customerData = {
        customer_name: 'テスト顧客',
        user_id: 2,
        email: 'test@example.com'
      }

      const request = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      await POST(request)

      // Assert
      const extraDataParam = mockClient.query.mock.calls[1][1][9] // extra_data parameter
      const extraData = JSON.parse(extraDataParam)
      
      expect(extraData).toEqual({
        created_by_admin: 5,
        email: 'test@example.com'
      })
    })

    it('should require admin authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: { customer_name: 'テスト', user_id: 1 }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
    })

    it('should handle database errors during creation', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // User exists
        .mockRejectedValue(new Error('Insert failed')) // Insert fails

      const customerData = {
        customer_name: 'テスト顧客',
        user_id: 2
      }

      const request = createMockRequest({
        method: 'POST',
        body: customerData,
        headers: { 'x-session-token': 'admin-session', 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('サーバーエラーが発生しました。')
    })
  })
})