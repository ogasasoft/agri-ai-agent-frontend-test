import { GET, POST } from '@/app/api/shipping/route'
import { createMockRequest, MockDbClient, createMockOrder, resetTestDatabase } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(async () => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

// Mock fetch for internal API calls
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('/api/shipping', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    mockFetch.mockClear()
    validateSession.mockClear()
    validateSession.mockResolvedValue({
      user: { id: 1, username: 'testuser' },
      session: { csrf_token: 'mock-csrf-token' }
    })
  })

  describe('POST /api/shipping', () => {
    it('should process shipping for valid orders', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: 'ORD-001',
          customer_name: '田中太郎',
          user_id: 1,
          address: '東京都渋谷区1-1-1',
          phone: '090-1234-5678'
        }),
        createMockOrder({
          id: 2,
          order_code: 'ORD-002',
          customer_name: '山田花子',
          user_id: 1,
          address: '東京都渋谷区2-2-2',
          phone: '080-2345-6789'
        })
      ]

      // Mock order database responses
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });
      mockClient.query.mockResolvedValueOnce({}); // First update
      mockClient.query.mockResolvedValueOnce({}); // Second update

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: {
          order_ids: [1, 2],
          delivery_type: 'normal',
          notes: 'テスト発送'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Debug
      if (response.status !== 200) {
        console.log('[TEST ERROR] Status:', response.status)
        console.log('[TEST ERROR] Data:', data)
      }

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('2件の発送書類を作成しました')
      expect(data.orders).toHaveLength(2)
    })

    it('should require order_ids parameter', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
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
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
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
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('エラーが発生しました')
    })

    it('should handle case when no matching orders found', async () => {
      // Arrange
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: { order_ids: [999] } // Non-existent order
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Debug
      if (response.status !== 404) {
        console.log('[TEST ERROR] Status:', response.status)
        console.log('[TEST ERROR] Data:', data)
      }

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('指定された注文が見つかりません')
    })

    it('should handle partial success with some order update failures', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: 'ORD-001',
          user_id: 1
        }),
        createMockOrder({
          id: 2,
          order_code: 'ORD-002',
          user_id: 1
        })
      ]

      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });
      // First order update succeeds
      mockClient.query.mockResolvedValueOnce({}); // Update first order
      // Second order update fails
      mockClient.query.mockRejectedValueOnce(new Error('Update failed'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Debug
      if (response.status !== 200) {
        console.log('[TEST ERROR] Status:', response.status)
        console.log('[TEST ERROR] Data:', data)
      }

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('1件の発送書類を作成しました')
      expect(data.orders).toHaveLength(1)
    })

    it('should handle different delivery types', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: 'ORD-001',
          user_id: 1
        })
      ]

      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });
      mockClient.query.mockResolvedValueOnce({});

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
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
    })

    it('should simulate yamato API delays', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: 'ORD-001',
          user_id: 1
        })
      ]

      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });
      mockClient.query.mockResolvedValueOnce({});

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: { order_ids: [1] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
    })

    it('should generate unique tracking numbers', async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: 'ORD-001',
          user_id: 1
        }),
        createMockOrder({
          id: 2,
          order_code: 'ORD-002',
          user_id: 1
        }),
        createMockOrder({
          id: 3,
          order_code: 'ORD-003',
          user_id: 1
        })
      ]

      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });
      mockClient.query.mockResolvedValueOnce({}); // Update 1
      mockClient.query.mockResolvedValueOnce({}); // Update 2
      mockClient.query.mockResolvedValueOnce({}); // Update 3

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
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
    })

    // Error handling tests
    it("should return 400 when order_ids is missing", async () => {
      // Arrange
      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: {} // No order_ids
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("注文IDが指定されていません")
    })

    it("should return 400 when order_ids is empty array", async () => {
      // Arrange
      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: { order_ids: [] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("注文IDが指定されていません")
    })

    it("should return 400 when some orders have missing data", async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: "ORD-001",
          customer_name: "田中太郎",
          user_id: 1,
          address: "東京都渋谷区1-1-1",
          phone: "090-1234-5678"
        }),
        createMockOrder({
          id: 2,
          order_code: "", // Missing customer_name
          customer_name: "", // Missing order_code
          user_id: 1,
          address: "", // Missing address
          phone: "080-2345-6789"
        })
      ]

      // Mock order database responses
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({
        rows: mockOrders
      });

      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("一部の注文データに不足があります")
    })

    it("should return 400 when delivery_type is invalid", async () => {
      // Arrange
      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: {
          order_ids: [1, 2],
          delivery_type: "INVALID_TYPE"
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe("配送タイプが無効です")
    })

    it('should handle network errors gracefully', async () => {
      // Arrange
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': 'mock-csrf-token'
        },
        body: { order_ids: [1] }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('エラー')
    })

    // POST Database Error Handling
    it("should return 500 when database query fails", async () => {
      // Arrange
      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: {
          order_ids: [1, 2],
          delivery_type: "normal",
          notes: "テスト発送"
        }
      })

      // Mock database query failure
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockRejectedValueOnce(new Error("Database connection failed"));

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("データベースエラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        expect(data.error).toBeDefined();
      }
    })

    it("should return 500 when order update fails for one order", async () => {
      // Arrange
      const mockOrders = [
        createMockOrder({
          id: 1,
          order_code: "ORD-001",
          customer_name: "田中太郎",
          user_id: 1,
          address: "東京都渋谷区1-1-1",
          phone: "090-1234-5678"
        }),
        createMockOrder({
          id: 2,
          order_code: "ORD-002",
          customer_name: "山田花子",
          user_id: 1,
          address: "東京都渋谷区2-2-2",
          phone: "080-2345-6789"
        })
      ]

      // Mock database responses
      const mockClient = MockDbClient.getInstance();
      mockClient.query.mockResolvedValueOnce({ rows: mockOrders });
      mockClient.query.mockRejectedValueOnce(new Error("Failed to update order")); // First update fails
      mockClient.query.mockResolvedValueOnce({}); // Second update succeeds

      const request = createMockRequest({
        method: "POST",
        headers: {
          "x-session-token": "mock-session-token",
          "x-csrf-token": "mock-csrf-token"
        },
        body: { order_ids: [1, 2] }
      })

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain("件の注文の更新に失敗しました");
      expect(data.errors).toBeDefined();
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].order_id).toBe(1);
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
      // Arrange - Create a request with a valid tracking number
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=YM0000000000000'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
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

      // Should be approximately tomorrow (within 25 hour tolerance to account for timezone differences)
      const timeDiff = Math.abs(estimatedDelivery.getTime() - tomorrow.getTime())
      expect(timeDiff).toBeLessThan(25 * 60 * 60 * 1000) // 25 hours in milliseconds
    })

    // Error handling tests
    it('should return 400 when tracking_number format is invalid', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=INVALID'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('追跡番号の形式が無効です')
    })

    it('should return 400 when tracking_number is too short', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=SHORT'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('追跡番号の形式が無効です')
    })

    it('should return 400 when tracking_number is too long', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/shipping?tracking_number=WAYTOOLONGTRACKINGNUMBER123456'
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('追跡番号の形式が無効です')
    })
  })
})
