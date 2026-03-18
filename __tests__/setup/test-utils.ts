import { Client } from 'pg'
import { NextRequest } from 'next/server'

// Factory function to create mock DB client
export function createMockDbClient(): MockDbClient {
  return MockDbClient.getInstance()
}

// Mock database client
export class MockDbClient {
  private static instance: MockDbClient
  public mockData: Record<string, any[]> = {}
  private mockError: Error | null = null

  static getInstance(): MockDbClient {
    if (!MockDbClient.instance) {
      MockDbClient.instance = new MockDbClient()
    }
    return MockDbClient.instance
  }

  async connect() {
    return Promise.resolve()
  }

  async end() {
    return Promise.resolve()
  }

  // Add Jest mock properties
  query = jest.fn().mockImplementation(async (text: string, params?: any[]) => {
    // Throw error if mock error is set
    if (this.mockError) {
      throw this.mockError
    }

    // Mock query responses based on SQL patterns
    if (text.includes('user_settings')) {
      return { rows: this.mockData.user_settings || [] }
    }
    if (text.includes('SELECT') && text.includes('users')) {
      return { rows: this.mockData.users || [] }
    }
    if (text.includes('SELECT') && text.includes('orders')) {
      let orders = this.mockData.orders || []
      // Filter by order IDs if specified in query
      if (params && params.length > 0 && text.includes('IN')) {
        const orderIds = params.slice(1) // Skip user_id parameter
        orders = orders.filter(order => orderIds.includes(order.id))
      }
      return { rows: orders }
    }
    if (text.includes('INSERT INTO orders')) {
      const mockOrder = {
        id: 1,
        order_code: params?.[0] || 'ORD-001',
        customer_name: params?.[1] || 'テストユーザー',
        phone: params?.[2] || '',
        address: params?.[3] || '',
        price: params?.[4] || 0,
        order_date: params?.[5] || '2024-01-01',
        delivery_date: params?.[6] || null,
        notes: params?.[7] || '',
        source: params?.[8] || 'manual_entry',
        extra_data: params?.[9] || '{}',
        user_id: params?.[10] || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return { rows: [mockOrder] }
    }
    if (text.includes('INSERT')) {
      return { rows: [{ id: 1, ...params }] }
    }
    if (text.includes('UPDATE')) {
      return { rows: [{ id: 1, ...params }] }
    }
    if (text.includes('DELETE')) {
      return { rows: [] }
    }

    return { rows: [] }
  })

  setMockData(table: string, data: any[]) {
    this.mockData[table] = data
  }

  setMockError(error: Error | null) {
    this.mockError = error
  }

  clearMockData() {
    this.mockData = {}
    this.mockError = null
    // Reset query mock to default implementation
    this.query = jest.fn().mockImplementation(async (text: string, params?: any[]) => {
      if (this.mockError) {
        throw this.mockError
      }
      if (text.includes('user_settings')) {
        return { rows: this.mockData.user_settings || [] }
      }
      if (text.includes('SELECT') && text.includes('users')) {
        return { rows: this.mockData.users || [] }
      }
      if (text.includes('SELECT') && text.includes('orders')) {
        let orders = this.mockData.orders || []
        if (params && params.length > 0 && text.includes('IN')) {
          const orderIds = params.slice(1)
          orders = orders.filter(order => orderIds.includes(order.id))
        }
        return { rows: orders }
      }
      if (text.includes('INSERT INTO orders')) {
        const mockOrder = {
          id: 1,
          order_code: params?.[0] || 'ORD-001',
          customer_name: params?.[1] || 'テストユーザー',
          phone: params?.[2] || '',
          address: params?.[3] || '',
          price: params?.[4] || 0,
          order_date: params?.[5] || '2024-01-01',
          delivery_date: params?.[6] || null,
          notes: params?.[7] || '',
          source: params?.[8] || 'manual_entry',
          extra_data: params?.[9] || '{}',
          user_id: params?.[10] || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        return { rows: [mockOrder] }
      }
      if (text.includes('INSERT')) {
        return { rows: [{ id: 1, ...params }] }
      }
      if (text.includes('UPDATE')) {
        return { rows: [{ id: 1, ...params }] }
      }
      if (text.includes('DELETE')) {
        return { rows: [] }
      }
      return { rows: [] }
    })
  }
}

// Mock NextRequest helper
export function createMockRequest(options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  cookies?: Record<string, string>
}): NextRequest {
  const { method = 'GET', url = 'http://localhost:3000', body, headers = {}, cookies = {} } = options

  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  })

  // Mock cookies
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value)
  })

  return request
}

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  is_super_admin: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockSession = (user: any = null) => ({
  user: user || createMockUser(),
  session: {
    id: 1,
    user_id: user?.id || 1,
    session_token: 'mock-session-token',
    csrf_token: 'mock-csrf-token',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_active: true
  }
})

export const createMockOrder = (overrides = {}) => ({
  id: 1,
  order_number: 'ORD-001',
  customer_name: '田中太郎',
  customer_phone: '090-1234-5678',
  customer_address: '東京都渋谷区1-1-1',
  total_amount: 3000,
  order_date: '2024-01-01',
  delivery_date: '2024-01-03',
  status: 'pending',
  has_memo: false,
  memo: null,
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

// Mock authentication helper
export const createMockAuthHeaders = (sessionToken = 'mock-session-token', csrfToken = 'mock-csrf-token') => ({
  'x-session-token': sessionToken,
  'x-csrf-token': csrfToken,
  'Content-Type': 'application/json',
})

// Mock file utilities for testing
export function createMockCsvFile(content: string, fileName = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' })
  return new File([blob], fileName, { type: 'text/csv' })
}

export function createFormDataRequest(
  file: File,
  sessionToken = 'session-token',
  csrfToken = 'csrf-token'
): NextRequest {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('csrf_token', csrfToken)

  return createMockRequest({
    method: 'POST',
    headers: {
      'x-session-token': sessionToken,
      'x-csrf-token': csrfToken
    },
    body: formData
  })
}

// Database test utilities
export async function resetTestDatabase() {
  const mockClient = MockDbClient.getInstance()
  mockClient.clearMockData()
}

export async function seedTestData() {
  const mockClient = MockDbClient.getInstance()

  // Seed users
  mockClient.setMockData('users', [
    createMockUser({ id: 1, username: 'testuser' }),
    createMockUser({ id: 2, username: 'admin', is_super_admin: true }),
  ])

  // Seed orders
  mockClient.setMockData('orders', [
    createMockOrder({ id: 1, order_number: 'ORD-001', user_id: 1 }),
    createMockOrder({ id: 2, order_number: 'ORD-002', user_id: 1 }),
  ])
}

// Error simulation utilities (requires fetch to be mocked separately)
export const simulateNetworkError = () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  if (mockFetch && mockFetch.mockRejectedValueOnce) {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
  }
}

export const simulateServerError = (status = 500) => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  if (mockFetch && mockFetch.mockResolvedValueOnce) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ error: 'Server error' })
    } as Response)
  }
}
