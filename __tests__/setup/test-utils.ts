import { Client } from 'pg'
import { NextRequest } from 'next/server'

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

  async query(text: string, params?: any[]) {
    // Throw error if mock error is set
    if (this.mockError) {
      throw this.mockError
    }
    
    // Mock query responses based on SQL patterns
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
    if (text.includes('SELECT') && text.includes('categories')) {
      let categories = this.mockData.categories || []
      
      // Handle category name duplication check
      if (text.includes('WHERE name = $1') && params && params.length >= 2) {
        const [name, userId] = params
        categories = categories.filter(cat => 
          cat.name === name && cat.user_id === userId && cat.is_active !== false
        )
        return { rows: categories }
      }
      
      // Handle display order calculation
      if (text.includes('MAX(display_order)')) {
        const userId = params?.[0] || 1
        const userCategories = categories.filter(cat => cat.user_id === userId)
        const maxOrder = userCategories.length > 0 
          ? Math.max(...userCategories.map(cat => cat.display_order || 1))
          : 0
        return { rows: [{ next_order: maxOrder + 1 }] }
      }
      
      // Handle main categories GET with subquery (most common case)
      if (text.includes('FROM categories') && text.includes('WHERE is_active = true') && params && params.length >= 1) {
        const userId = params[0]
        categories = categories.filter(cat => 
          cat.user_id === userId && cat.is_active !== false
        )
        // Add order_count to each category for subquery
        const categoriesWithCount = categories.map(cat => ({
          ...cat,
          order_count: '0' // Mock order count
        }))
        return { rows: categoriesWithCount }
      }
      
      // Default fallback for categories
      if (params && params.length >= 1) {
        const userId = params[0]
        categories = categories.filter(cat => cat.user_id === userId)
      }
      return { rows: categories }
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
        category_id: params?.[8] || null,
        source: params?.[9] || 'manual_entry',
        extra_data: params?.[10] || '{}',
        user_id: params?.[11] || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      return { rows: [mockOrder] }
    }
    if (text.includes('INSERT INTO categories')) {
      const nextId = (this.mockData.categories?.length || 0) + 1
      const mockCategory = {
        id: nextId,
        name: params?.[0] || 'テストカテゴリ',
        description: params?.[1] || '',
        color: params?.[2] || 'gray',
        icon: params?.[3] || 'Package',
        display_order: params?.[4] || 1,
        is_active: true,
        user_id: params?.[5] || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      // Add to mock data for consistency
      if (!this.mockData.categories) {
        this.mockData.categories = []
      }
      this.mockData.categories.push(mockCategory)
      return { rows: [mockCategory] }
    }
    if (text.includes('INSERT')) {
      return { rows: [{ id: 1, ...params }] }
    }
    if (text.includes('UPDATE') && text.includes('categories')) {
      const categoryId = params?.[params.length - 1] || 1 // ID is usually last param in WHERE clause
      const existingCategory = this.mockData.categories?.find(cat => cat.id === categoryId)
      if (existingCategory) {
        const updatedCategory = { ...existingCategory, updated_at: new Date().toISOString() }
        return { rows: [updatedCategory] }
      }
      return { rows: [] }
    }
    if (text.includes('UPDATE')) {
      return { rows: [{ id: 1, ...params }] }
    }
    if (text.includes('DELETE') && text.includes('categories')) {
      // Soft delete - set is_active to false
      const categoryId = params?.[0] || 1
      const category = this.mockData.categories?.find(cat => cat.id === categoryId)
      if (category) {
        category.is_active = false
        return { rows: [category] }
      }
      return { rows: [] }
    }
    if (text.includes('DELETE')) {
      return { rows: [] }
    }
    
    return { rows: [] }
  }

  setMockData(table: string, data: any[]) {
    this.mockData[table] = data
  }

  setMockError(error: Error | null) {
    this.mockError = error
  }

  clearMockData() {
    this.mockData = {}
    this.mockError = null
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

export const createMockSession = (overrides = {}) => ({
  id: 1,
  user_id: 1,
  session_token: 'mock-session-token',
  csrf_token: 'mock-csrf-token',
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  ...overrides
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
  category_id: 1,
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockCategory = (overrides = {}) => ({
  id: 1,
  name: '野菜',
  description: '新鮮な野菜',
  color: 'green',
  icon: 'Carrot',
  display_order: 1,
  is_active: true,
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

  // Seed categories
  mockClient.setMockData('categories', [
    createMockCategory({ id: 1, name: '野菜', user_id: 1 }),
    createMockCategory({ id: 2, name: '果物', user_id: 1 }),
  ])

  // Seed orders
  mockClient.setMockData('orders', [
    createMockOrder({ id: 1, order_number: 'ORD-001', user_id: 1, category_id: 1 }),
    createMockOrder({ id: 2, order_number: 'ORD-002', user_id: 1, category_id: 2 }),
  ])
}

// Error simulation utilities
export const simulateNetworkError = () => {
  fetch.mockRejectedValueOnce(new Error('Network error'))
}

export const simulateServerError = (status = 500) => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: 'Server error' })
  })
}