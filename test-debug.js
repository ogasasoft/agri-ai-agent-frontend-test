const { GET } = require('./app/api/admin/customers/route.ts')
const { createMockRequest, MockDbClient, createMockUser } = require('./__tests__/setup/test-utils')

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

async function test() {
  const mockClient = MockDbClient.getInstance()
  mockClient.clearMockData()
  
  // Seed mock data
  mockClient.setMockData('users', [
    createMockUser({ id: 1, username: 'testuser' }),
    createMockUser({ id: 2, username: 'admin', is_super_admin: true }),
  ])
  
  mockClient.setMockData('orders', [
    { id: 1, order_number: 'ORD-001', user_id: 1 },
    { id: 2, order_number: 'ORD-002', user_id: 1 },
  ])
  
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
  
  const mockAdminUser = createMockUser({ id: 1, is_super_admin: true })
  
  // Set up the query mock
  mockClient.query.mockResolvedValue({
    rows: [
      {
        id: 1,
        customer_name: '田中太郎',
        phone: '090-1234-5678',
        address: '東京都渋谷区1-1-1',
        email: 'tanaka@example.com',
        user_id: 2,
        total_orders: 3,
        total_spent: '15000',
        last_order_date: '2024-01-15',
        created_at: '2024-01-01T00:00:00Z',
        username: 'farmer1'
      },
      {
        id: 2,
        customer_name: '山田花子',
        phone: '090-9876-5432',
        address: '大阪府大阪市2-2-2',
        email: 'yamada@example.com',
        user_id: 3,
        total_orders: 2,
        total_spent: '8000',
        last_order_date: '2024-01-10',
        created_at: '2024-01-02T00:00:00Z',
        username: 'farmer2'
      }
    ]
  })
  
  const request = createMockRequest({
    method: 'GET',
    headers: { 'x-session-token': 'admin-session' }
  })
  
  console.log('Testing GET customers...')
  console.log('MockClient.query mock calls:', mockClient.query.mock.calls)
  
  try {
    const response = await GET(request)
    const data = await response.json()
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error)
    console.error('Stack:', error.stack)
  }
}

test()
