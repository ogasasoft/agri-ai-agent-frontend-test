import { Client } from 'pg'
import { NextRequest, NextResponse } from 'next/server'

// Mock NextResponse for Next.js 16 API routes
// Note: Use NextResponse from 'next/server' directly in route files
// This is exported for documentation purposes
export const NextResponseMock = NextResponse

// Mock the db module
export const getDbClient = jest.fn(async () => MockDbClient.getInstance())

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
    if (text.includes('customers')) {
      if (text.includes('JOIN users u ON c.user_id = u.id')) {
        // Return customers with user joins
        if (!this.mockData.customers) {
          this.mockData.customers = []
        }
        return { rows: this.mockData.customers }
      }
      if (text.includes('INSERT INTO customers')) {
        const [customer_name, phone, address, email, user_id] = params || []
        if (!this.mockData.customers) {
          this.mockData.customers = []
        }
        const newCustomer = {
          id: 1,
          customer_name,
          phone,
          address,
          email,
          user_id,
          total_orders: 0,
          total_spent: 0
        }
        this.mockData.customers.push(newCustomer)
        return { rows: [newCustomer] }
      }
      if (text.includes('SELECT') && text.includes('customers') && text.includes('GROUP BY')) {
        // Return customers with statistics - match the exact query pattern from route.ts
        if (text.includes('JOIN users u ON c.user_id = u.id')) {
          const customers = this.mockData.customers || []
          const users = this.mockData.users || []

          const result = customers.map((customer: any) => {
            const user = users.find((u: any) => u.id === customer.user_id) || {
              id: customer.user_id,
              username: `user_${customer.user_id}`
            }

            // Count orders for this customer
            const orders = this.mockData.orders || []
            const customerOrders = orders.filter((o: any) => o.user_id === customer.user_id)

            return {
              ...customer,
              username: user.username,
              total_orders: customerOrders.length,
              total_spent: customerOrders.reduce((sum: number, order: any) => sum + (order.price || 0), 0)
            }
          })

          // Sort by customer_name and phone as in the query
          result.sort((a: any, b: any) => {
            if (a.customer_name !== b.customer_name) {
              return a.customer_name.localeCompare(b.customer_name)
            }
            return a.phone.localeCompare(b.phone)
          })

          return { rows: result }
        }
        if (!this.mockData.customers) {
          this.mockData.customers = []
        }
        return { rows: this.mockData.customers }
      }
      if (text.includes('FROM customers') && !text.includes('JOIN')) {
        // Simple SELECT from customers
        if (!this.mockData.customers) {
          this.mockData.customers = []
        }
        return { rows: this.mockData.customers }
      }
    }

    // Categories queries - must be before orders since GET categories has a subquery mentioning orders
    if (text.includes('categories')) {
      // Get max display_order for new category
      if (text.includes('COALESCE') && text.includes('display_order')) {
        return { rows: [{ next_order: (this.mockData.categories?.length || 0) + 1 }] }
      }
      // Order count check for DELETE (FROM orders without FROM categories as outer)
      if (text.includes('COUNT(*)') && text.includes('category_id') && !text.includes('FROM categories')) {
        const orders = this.mockData.orders || []
        const categoryId = params?.[0]
        const count = orders.filter((o: any) => o.category_id === categoryId || o.category_id === Number(categoryId)).length
        return { rows: [{ count: count.toString() }] }
      }
      if (text.includes('SELECT') && text.includes('FROM categories')) {
        const cats = this.mockData.categories || []
        // Duplicate name check: WHERE name = $1 AND ... user_id = $2
        if (params && text.includes('name = $1') && text.includes('user_id = $2')) {
          return { rows: cats.filter((c: any) => c.name === params[0] && c.user_id === params[1]) }
        }
        // Name conflict check: WHERE name = $1 AND id != $2
        if (params && text.includes('name = $1') && text.includes('id !=')) {
          return { rows: cats.filter((c: any) => c.name === params[0] && c.id !== params[1] && c.id !== Number(params[1])) }
        }
        // Exists by ID: WHERE id = $1 (exclude user_id = $1 matches)
        if (params && text.includes('id = $1') && !text.includes('user_id = $1')) {
          return { rows: cats.filter((c: any) => c.id === params[0] || c.id === Number(params[0])) }
        }
        return { rows: cats }
      }
      if (text.includes('INSERT INTO categories')) {
        const [name, description, color, icon, display_order, user_id] = params || []
        return { rows: [{ id: 1, name, description: description || '', color: color || 'gray', icon: icon || 'Package', display_order: display_order || 1, is_active: true, user_id: user_id || 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] }
      }
      // UPDATE categories (data fields update)
      if (text.includes('UPDATE categories') && text.includes('name = $1')) {
        const [name, description, color, icon, display_order] = params || []
        const cats = this.mockData.categories || []
        const existing = cats.length > 0 ? cats[0] : {}
        return { rows: [{ ...existing, name, description, color, icon, display_order, updated_at: new Date().toISOString() }] }
      }
      // Soft delete or other UPDATE
      if (text.includes('UPDATE categories') || text.includes('DELETE FROM categories')) {
        return { rows: [] }
      }
    }

    // Count orders by category_id (DELETE category check - query uses FROM orders not FROM categories)
    if (text.includes('COUNT(*)') && text.includes('category_id') && !text.includes('FROM categories')) {
      const orders = this.mockData.orders || []
      const categoryId = params?.[0]
      const count = orders.filter((o: any) => o.category_id === categoryId || o.category_id === Number(categoryId)).length
      return { rows: [{ count: count.toString() }] }
    }
    if (text.includes('SELECT') && text.includes('orders')) {
      let orders = this.mockData.orders || []
      // Filter by order IDs if specified in query
      if (params && params.length > 0 && text.includes('IN')) {
        const orderIds = params.slice(1) // Skip user_id parameter
        orders = orders.filter((order: any) => orderIds.includes(order.id))
      }
      // Filter by order_id if specified
      if (params && text.includes('WHERE') && text.includes('order_id')) {
        const orderId = params[0]
        orders = orders.filter((o: any) => o.id === orderId || o.id === Number(orderId))
      }
      // Get distinct orders with user join for admin customers API
      if (text.includes('DISTINCT o.') && text.includes('JOIN users u')) {
        const joinedOrders: any[] = []
        orders.forEach((order: any) => {
          const user = this.mockData.users?.find((u: any) => u.id === order.user_id) || {
            id: order.user_id,
            username: `user_${order.user_id}`
          }
          joinedOrders.push({
            customer_name: order.customer_name,
            phone: order.phone,
            address: order.address,
            user_id: order.user_id,
            username: user.username,
            id: order.id,
            total_orders: '1', // Default value
            total_spent: (order.price || 0).toString(),
            last_order_date: order.order_date,
            created_at: order.created_at
          })
        })
        // Order by created_at
        if (text.includes('ORDER BY') && text.includes('created_at')) {
          joinedOrders.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.order_date).getTime()
            const dateB = new Date(b.created_at || b.order_date).getTime()
            return dateB - dateA
          })
        }
        return { rows: joinedOrders }
      }
      // Order by created_at for other queries
      if (text.includes('ORDER BY') && text.includes('created_at')) {
        orders = orders.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.order_date).getTime()
          const dateB = new Date(b.created_at || b.order_date).getTime()
          return dateB - dateA
        })
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
        // Enhanced user query detection for auth-enhanced.ts
        if (text.includes('WHERE username = $1 OR email = $1')) {
          return { rows: this.mockData.users || [] }
        }
        // Also handle generic user queries
        if (text.includes('SELECT') && text.includes('users')) {
          return { rows: this.mockData.users || [] }
        }
      }
      // Categories queries - must be before orders
      if (text.includes('categories')) {
        if (text.includes('COALESCE') && text.includes('display_order')) {
          return { rows: [{ next_order: (this.mockData.categories?.length || 0) + 1 }] }
        }
        if (text.includes('COUNT(*)') && text.includes('category_id') && !text.includes('FROM categories')) {
          const orders = this.mockData.orders || []
          const categoryId = params?.[0]
          const count = orders.filter((o: any) => o.category_id === categoryId || o.category_id === Number(categoryId)).length
          return { rows: [{ count: count.toString() }] }
        }
        if (text.includes('SELECT') && text.includes('FROM categories')) {
          const cats = this.mockData.categories || []
          if (params && text.includes('name = $1') && text.includes('user_id = $2')) {
            return { rows: cats.filter((c: any) => c.name === params[0] && c.user_id === params[1]) }
          }
          if (params && text.includes('name = $1') && text.includes('id !=')) {
            return { rows: cats.filter((c: any) => c.name === params[0] && c.id !== params[1] && c.id !== Number(params[1])) }
          }
          if (params && text.includes('id = $1') && !text.includes('user_id = $1')) {
            return { rows: cats.filter((c: any) => c.id === params[0] || c.id === Number(params[0])) }
          }
          return { rows: cats }
        }
        if (text.includes('INSERT INTO categories')) {
          const [name, description, color, icon, display_order, user_id] = params || []
          return { rows: [{ id: 1, name, description: description || '', color: color || 'gray', icon: icon || 'Package', display_order: display_order || 1, is_active: true, user_id: user_id || 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] }
        }
        if (text.includes('UPDATE categories') && text.includes('name = $1')) {
          const [name, description, color, icon, display_order] = params || []
          const cats = this.mockData.categories || []
          const existing = cats.length > 0 ? cats[0] : {}
          return { rows: [{ ...existing, name, description, color, icon, display_order, updated_at: new Date().toISOString() }] }
        }
        if (text.includes('UPDATE categories') || text.includes('DELETE FROM categories')) {
          return { rows: [] }
        }
      }
      // Count orders by category_id (DELETE category check)
      if (text.includes('COUNT(*)') && text.includes('category_id') && !text.includes('FROM categories')) {
        const orders = this.mockData.orders || []
        const categoryId = params?.[0]
        const count = orders.filter((o: any) => o.category_id === categoryId || o.category_id === Number(categoryId)).length
        return { rows: [{ count: count.toString() }] }
      }
      if (text.includes('SELECT') && text.includes('orders')) {
        let orders = this.mockData.orders || []
        if (params && params.length > 0 && text.includes('IN')) {
          const orderIds = params.slice(1)
          orders = orders.filter((order: any) => orderIds.includes(order.id))
        }
        // Filter by order_id if specified
        if (params && text.includes('WHERE') && text.includes('order_id')) {
          const orderId = params[0]
          orders = orders.filter((o: any) => o.id === orderId || o.id === Number(orderId))
        }
        // Get distinct orders with user join for admin customers API
        if (text.includes('DISTINCT o.') && text.includes('JOIN users u')) {
          const joinedOrders: any[] = []
          orders.forEach((order: any) => {
            const user = this.mockData.users?.find((u: any) => u.id === order.user_id) || {
              id: order.user_id,
              username: `user_${order.user_id}`
            }
            joinedOrders.push({
              customer_name: order.customer_name,
              phone: order.phone,
              address: order.address,
              user_id: order.user_id,
              username: user.username,
              id: order.id,
              total_orders: '1',
              total_spent: (order.price || 0).toString(),
              last_order_date: order.order_date,
              created_at: order.created_at
            })
          })
          // Order by created_at
          if (text.includes('ORDER BY') && text.includes('created_at')) {
            joinedOrders.sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || a.order_date).getTime()
              const dateB = new Date(b.created_at || b.order_date).getTime()
              return dateB - dateA
            })
          }
          return { rows: joinedOrders }
        }
        // Order by created_at for other queries
        if (text.includes('ORDER BY') && text.includes('created_at')) {
          orders = orders.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.order_date).getTime()
            const dateB = new Date(b.created_at || b.order_date).getTime()
            return dateB - dateA
          })
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

  // Auto-set Content-Type header for POST requests with body
  const requestHeaders: Record<string, string> = { ...headers }

  // Auto-set Content-Type header for POST requests with body
  if (method === 'POST' && body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  // Auto-set X-Request-URL header for Next.js 16 compatibility
  requestHeaders['x-request-url'] = url

  // Mock cookies - include in headers
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
    requestHeaders['cookie'] = cookieString
  }

  const request = new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Next.js 16: URL is read-only, so we use x-request-url header instead
  // No need to redefine url property

  // Also set cookies via the cookies object
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value)
  })

  // Fix for Next.js 16: Make cookies.get() work properly
  // We need to mock the cookies.get() method
  const cookieMap = new Map()
  Object.entries(cookies).forEach(([name, value]) => {
    cookieMap.set(name, value)
  })
  request.cookies.get = (name: string) => {
    return cookieMap.get(name)
  }

  // Fix for auth-enhanced.ts getClientInfo: Add ip property if missing
  (request as any).ip = requestHeaders['x-forwarded-for']?.split(',')[0] || requestHeaders['x-real-ip'] || '127.0.0.1'

  // Fix for auth-enhanced.ts getClientInfo: Add headers property with a proper getter
  Object.defineProperty(request, 'headers', {
    get: () => {
      const headersObj: any = {}
      Object.keys(requestHeaders).forEach(key => {
        headersObj[key.toLowerCase()] = requestHeaders[key]
      })
      headersObj.get = (key: string) => headersObj[key.toLowerCase()]
      return headersObj
    }
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

  // Seed customers
  mockClient.setMockData('customers', [
    {
      id: 1,
      customer_name: '田中太郎',
      phone: '090-1234-5678',
      address: '東京都渋谷区1-1-1',
      email: 'tanaka@example.com',
      user_id: 2,
      total_orders: 3,
      total_spent: 15000,
      last_order_date: '2024-01-15',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      customer_name: '山田花子',
      phone: '090-9876-5432',
      address: '大阪府大阪市2-2-2',
      email: 'yamada@example.com',
      user_id: 3,
      total_orders: 2,
      total_spent: 8000,
      last_order_date: '2024-01-10',
      created_at: '2024-01-02T00:00:00Z'
    }
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
