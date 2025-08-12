import { GET, POST } from '@/app/api/shipping/route'
import { createMockRequest, MockDbClient, createMockOrder, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

// Mock fetch for internal API calls
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('/api/shipping', () => {
  let mockClient: MockDbClient

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    mockFetch.mockClear()
  })

  describe('POST /api/shipping', () => {
    it('should process shipping for valid orders', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({ 
          id: 1, 
          order_number: 'ORD-001', 
          customer_name: '田中太郎',
          user_id: 1 
        }),
        createMockOrder({ 
          id: 2, 
          order_number: 'ORD-002', 
          customer_name: '山田花子',
          user_id: 1 
        })
      ]

      // Mock orders API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrders)
        } as Response)
        // Mock order update responses
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { 
          order_ids: [1, 2],
          delivery_type: 'normal',
          notes: 'テスト発送'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('2件の発送書類を作成しました')
      expect(data.orders).toHaveLength(2)
      expect(data.orders[0]).toEqual(
        expect.objectContaining({
          id: 1,
          tracking_number: expect.stringMatching(/^YM\d+001$/),
          label_url: expect.stringContaining('mock-yamato.com')
        })
      )
      expect(data.yamato_results).toHaveLength(2)
      expect(data.errors).toEqual([])
    })

    it('should require order_ids parameter', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: {} // Missing order_ids
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('注文IDが指定されていません')
    })

    it('should validate order_ids as non-empty array', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [] } // Empty array
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('注文IDが指定されていません')
    })

    it('should handle orders API failure', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('注文データの取得に失敗しました')
    })

    it('should handle case when no matching orders found', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]) // No orders
      } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [999] } // Non-existent order
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('指定された注文が見つかりません')
    })

    it('should handle partial success with some order update failures', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({ id: 1, order_number: 'ORD-001' }),
        createMockOrder({ id: 2, order_number: 'ORD-002' })
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrders)
        } as Response)
        // First order update succeeds
        .mockResolvedValueOnce({ ok: true } as Response)
        // Second order update fails
        .mockResolvedValueOnce({ ok: false } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true) // Still success because at least one succeeded
      expect(data.message).toBe('1件の発送書類を作成しました')
      expect(data.orders).toHaveLength(1)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0]).toContain('ORD-002')
    })

    it('should handle different delivery types', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({ id: 1, order_number: 'ORD-001' })
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrders)
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)

      const request = createMockRequest({
        method: 'POST',
        body: { 
          order_ids: [1],
          delivery_type: 'express', // Different delivery type
          notes: '急ぎの発送'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.orders).toHaveLength(1)
      expect(data.yamato_results[0].success).toBe(true)
    })

    it('should simulate yamato API delays', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({ id: 1, order_number: 'ORD-001' })
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrders)
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)

      const startTime = Date.now()
      
      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [1] }
      })

      // Act
      const response = await POST(request)
      const endTime = Date.now()

      // Assert
      expect(response.status).toBe(200)
      // Should take at least 1000ms due to simulated API delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(950) // Allow some tolerance
    })

    it('should generate unique tracking numbers', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({ id: 1, order_number: 'ORD-001' }),
        createMockOrder({ id: 2, order_number: 'ORD-002' }),
        createMockOrder({ id: 3, order_number: 'ORD-003' })
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOrders)
        } as Response)
        .mockResolvedValue({ ok: true } as Response) // Multiple updates

      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [1, 2, 3] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.orders).toHaveLength(3)
      
      const trackingNumbers = data.orders.map((o: any) => o.tracking_number)
      const uniqueTrackingNumbers = new Set(trackingNumbers)
      
      expect(uniqueTrackingNumbers.size).toBe(3) // All should be unique
      expect(trackingNumbers[0]).toMatch(/001$/) // First should end with 001
      expect(trackingNumbers[1]).toMatch(/002$/) // Second should end with 002
      expect(trackingNumbers[2]).toMatch(/003$/) // Third should end with 003
    })

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createMockRequest({
        method: 'POST',
        body: { order_ids: [1] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Network error')
    })
  })

  describe('GET /api/shipping (tracking)', () => {
    it('should return tracking information for valid tracking number', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=YM1234567890123'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.tracking_info).toEqual(
        expect.objectContaining({
          tracking_number: 'YM1234567890123',
          status: 'in_transit',
          status_text: '配送中',
          estimated_delivery: expect.any(String),
          history: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              status: expect.any(String),
              location: expect.any(String)
            })
          ])
        })
      )
    })

    it('should require tracking_number parameter', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping' // No tracking_number
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('追跡番号が指定されていません')
    })

    it('should return mock tracking history with multiple events', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=YM9999999999999'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.tracking_info.history).toHaveLength(2)
      expect(data.tracking_info.history[0].status).toBe('集荷完了')
      expect(data.tracking_info.history[1].status).toBe('受付')
      expect(data.tracking_info.estimated_delivery).toBeDefined()
    })

    it('should handle tracking API errors gracefully', async () => {
      // Arrange - Create a request that will cause an internal error
      const request = createMockRequest({
        method: 'GET',
        url: 'invalid-url' // This will cause URL parsing to fail
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('配送状況の取得中にエラーが発生しました')
    })

    it('should format dates correctly in tracking history', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=YM1111111111111'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      
      const { tracking_info } = data
      expect(tracking_info.estimated_delivery).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      
      tracking_info.history.forEach((event: any) => {
        expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      })
    })

    it('should provide realistic delivery estimate', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=YM2222222222222'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      
      const estimatedDelivery = new Date(data.tracking_info.estimated_delivery)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      // Should be approximately tomorrow (within 1 hour tolerance)
      const timeDiff = Math.abs(estimatedDelivery.getTime() - tomorrow.getTime())
      expect(timeDiff).toBeLessThan(60 * 60 * 1000) // 1 hour in milliseconds
    })
  })
})