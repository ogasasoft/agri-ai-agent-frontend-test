// Mock @/lib/db BEFORE importing it
jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(async () => MockDbClient.getInstance())
}))

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/admin-auth', () => ({
  validateAdminSession: jest.fn(),
}))

import { GET } from '@/app/api/admin/dashboard/stats/route'
import { createMockRequest, MockDbClient, createMockUser, resetTestDatabase } from '../../setup/test-utils'

describe('/api/admin/dashboard/stats', () => {
  let mockClient: MockDbClient
  const { validateAdminSession } = require('@/lib/admin-auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateAdminSession.mockClear()
  })

  describe('GET /api/admin/dashboard/stats', () => {
    it('should return system statistics for admin user', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 1, 
        username: 'admin',
        is_super_admin: true
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock query results for statistics (7 total: 5 stats + 2 for weekly growth)
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '25' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '150' }] }) // orders
        .mockResolvedValueOnce({ rows: [{ count: '75' }] }) // customers
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // integrations
        .mockResolvedValueOnce({ rows: [{ count: '12' }] }) // today orders
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // current week orders
        .mockResolvedValueOnce({ rows: [{ count: '8' }] }) // previous week orders

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
      expect(data.stats).toEqual({
        totalUsers: 25,
        totalOrders: 150,
        totalCustomers: 75,
        activeIntegrations: 3,
        todayOrders: 12,
        weeklyGrowth: 25, // (10 - 8) / 8 * 100 = 25
        systemHealth: 'healthy',
        lastBackup: expect.any(String)
      })

      // Verify all stat queries were executed (7 total: 5 for stats + 2 for weekly growth)
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users WHERE is_active = true')
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM orders')
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(DISTINCT customer_name) FROM orders')
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM api_integrations WHERE is_active = true')
      expect(mockClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE')

      // Check that the weekly growth queries were called with the same SQL
      const calls = mockClient.query.mock.calls
      const weeklyGrowthQueries = calls.filter(call => call[0].includes('WHERE created_at >= $1 AND created_at < $2'))
      expect(weeklyGrowthQueries.length).toBe(2)
    })

    it('should handle zero counts gracefully', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock all zero results
      mockClient.query = jest.fn()
        .mockResolvedValue({ rows: [{ count: '0' }] })

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
      expect(data.stats).toEqual({
        totalUsers: 0,
        totalOrders: 0,
        totalCustomers: 0,
        activeIntegrations: 0,
        todayOrders: 0,
        weeklyGrowth: 0,
        systemHealth: 'healthy',
        lastBackup: expect.any(String)
      })
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
    })

    it('should reject non-admin users', async () => {
      // Arrange
      validateAdminSession.mockResolvedValue(null) // Non-admin user

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

    it('should handle database connection errors', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock database connection error
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
      expect(data.message).toBe('データベースエラーが発生しました。')
    })

    it('should handle partial query failures', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      // Mock first query succeeds, second fails
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // users query succeeds
        .mockRejectedValue(new Error('Query failed')) // subsequent queries fail

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
      expect(data.message).toBe('データベースエラーが発生しました。')
    })

    it('should format lastBackup as ISO string', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValue({ rows: [{ count: '1' }] })

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.stats.lastBackup).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })

    it('should execute all queries in parallel', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      let queryCount = 0
      mockClient.query = jest.fn().mockImplementation(() => {
        queryCount++
        return Promise.resolve({ rows: [{ count: `${queryCount}` }] })
      })

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      const startTime = Date.now()

      // Act
      const response = await GET(request)
      const endTime = Date.now()

      // Assert
      expect(response.status).toBe(200)
      
      // Should execute 7 queries in parallel (5 for stats + 2 for weekly growth)
      expect(mockClient.query).toHaveBeenCalledTimes(7)

      // Verify the weekly growth queries (both have the same SQL pattern)
      const queryCalls = mockClient.query.mock.calls
      const weeklyGrowthQueries = queryCalls.filter(call => call[0].includes('WHERE created_at >= $1 AND created_at < $2'))
      expect(weeklyGrowthQueries.length).toBe(2)
      
      // Should be faster than sequential execution (less than 100ms for mocked queries)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should work with regular admin (not super admin)', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ 
        id: 2,
        username: 'moderator',
        is_super_admin: false // Regular admin
      })

      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValue({ rows: [{ count: '5' }] })

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'mod-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats.totalUsers).toBe(5)
    })

    it('should handle large count values', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const previousSevenDaysAgo = new Date(sevenDaysAgo);
      previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 7);

      // Mock large count values
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '999999' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '2147483647' }] }) // orders - max int32
        .mockResolvedValueOnce({ rows: [{ count: '100000' }] }) // customers
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // integrations
        .mockResolvedValueOnce({ rows: [{ count: '1500' }] }) // today orders
        .mockResolvedValueOnce({ rows: [{ count: '50000' }] }) // current week orders
        .mockResolvedValueOnce({ rows: [{ count: '48000' }] }) // previous week orders

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.stats.totalUsers).toBe(999999)
      expect(data.stats.totalOrders).toBe(2147483647)
      expect(data.stats.totalCustomers).toBe(100000)
      expect(data.stats.activeIntegrations).toBe(50)
      expect(data.stats.todayOrders).toBe(1500)
      expect(data.stats.weeklyGrowth).toBe(4) // (50000 - 48000) / 48000 * 100 = 4.166... -> 4
    })

    it('should return 0 for weekly growth when no previous week orders', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const previousSevenDaysAgo = new Date(sevenDaysAgo);
      previousSevenDaysAgo.setDate(previousSevenDaysAgo.getDate() - 7);

      // Mock count values with 0 previous week orders
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // orders
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // customers
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // integrations
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // today orders
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // current week orders
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // previous week orders
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // current week orders
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // previous week orders

      const request = createMockRequest({
        method: 'GET',
        headers: { 'x-session-token': 'admin-session' }
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.stats.totalUsers).toBe(10)
      expect(data.stats.totalOrders).toBe(20)
      expect(data.stats.totalCustomers).toBe(10)
      expect(data.stats.activeIntegrations).toBe(3)
      expect(data.stats.todayOrders).toBe(5)
      expect(data.stats.weeklyGrowth).toBe(0) // Should be 0 when previous week has 0 orders
    })

    it('should validate admin session token from cookies', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ is_super_admin: true })
      validateAdminSession.mockResolvedValue(mockAdminUser)

      mockClient.query = jest.fn()
        .mockResolvedValue({ rows: [{ count: '10' }] })

      const request = createMockRequest({
        method: 'GET',
        cookies: { session_token: 'cookie-admin-session' }
      })

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
      expect(validateAdminSession).toHaveBeenCalledWith('cookie-admin-session')
    })
  })
})