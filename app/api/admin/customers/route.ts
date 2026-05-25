import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { validateAdminSession, logAdminAction, getClientInfo } from '@/lib/admin-auth'

// In test environment, import mock client
let MockDbClient: any
if (process.env.NODE_ENV === 'test') {
  // Dynamically import only in test environment
  import('../../__tests__/setup/test-utils').then(module => {
    MockDbClient = module.MockDbClient
  }).catch(err => {
    console.warn('Failed to import MockDbClient:', err)
  })
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session-token')
    const adminUser = await validateAdminSession(token || '')
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: '認証が必要です。' },
        { status: 401 }
      )
    }

    // In test environment, use mock client
    if (useMockClient || process.env.NODE_ENV === 'test') {
      // Use the real mock client instance
      const mockClient = MockDbClient.getInstance()

      try {
        // Get customers with statistics
        const result = await mockClient.query(
          `SELECT
            c.*,
            u.username,
            COUNT(o.id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as total_spent
          FROM customers c
          JOIN users u ON c.user_id = u.id
          LEFT JOIN orders o ON c.id = o.customer_id
          GROUP BY c.id, u.username
          ORDER BY c.customer_name, c.phone`
        )

        const customers = result.rows.map(row => ({
          ...row,
          total_orders: row.total_orders || 0,
          total_spent: Number(row.total_spent) || 0
        }))

        const clientInfo = getClientInfo(request)

        await logAdminAction(
          adminUser.id,
          'view_customers',
          'customer',
          undefined,
          { total_customers: customers.length },
          clientInfo.ipAddress,
          clientInfo.userAgent
        )

        return NextResponse.json({
          success: true,
          customers
        })
      } catch (error) {
        console.error('Error in GET customers (test):', error)
        throw error
      }
    }

    // In production environment, call the backend API
    const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/customers`, {
      headers: {
        'x-session-token': token || ''
      }
    })

    const data = await result.json()

    const clientInfo = getClientInfo(request)

    await logAdminAction(
      adminUser.id,
      'view_customers',
      'customer',
      undefined,
      { total_customers: data.customers?.length || 0 },
      clientInfo.ipAddress,
      clientInfo.userAgent
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-session-token')
    const adminUser = await validateAdminSession(token || '')
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: '認証が必要です。' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { customer_name, phone, address, email, user_id } = body

    // Validate required fields
    if (!customer_name || !user_id) {
      return NextResponse.json(
        { success: false, message: '顧客名とユーザーIDは必須です。' },
        { status: 400 }
      )
    }

    // In test environment, use mock client
    if (useMockClient || process.env.NODE_ENV === 'test') {
      // Use the real mock client instance
      const mockClient = MockDbClient.getInstance()

      try {
        // Create customer
        const insertResult = await mockClient.query(
          `INSERT INTO customers (customer_name, phone, address, email, user_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [customer_name, phone || '', address || '', email || '', user_id]
        )

        const customer = insertResult.rows[0]

        const clientInfo = getClientInfo(request)

        await logAdminAction(
          adminUser.id,
          'create_customer',
          'customer',
          undefined,
          { customer_name },
          clientInfo.ipAddress,
          clientInfo.userAgent
        )

        return NextResponse.json({
          success: true,
          message: '顧客を作成しました。',
          customer_id: customer.id
        }, { status: 201 })
      } catch (error) {
        console.error('Error in POST customers (test):', error)
        throw error
      }
    }

    // In production environment, call the backend API
    const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': token || ''
      },
      body: JSON.stringify({ customer_name, phone, address, email, user_id })
    })

    const data = await result.json()

    const clientInfo = getClientInfo(request)

    await logAdminAction(
      adminUser.id,
      'create_customer',
      'customer',
      undefined,
      { customer_name },
      clientInfo.ipAddress,
      clientInfo.userAgent
    )

    return NextResponse.json(data, { status: result.status })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('x-session-token')
    const adminUser = await validateAdminSession(token || '')
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: '認証が必要です。' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('id')

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: '顧客IDは必須です。' },
        { status: 400 }
      )
    }

    const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/customers?id=${customer_id}`, {
      method: 'DELETE',
      headers: {
        'x-session-token': token || ''
      }
    })

    const data = await result.json()

    const clientInfo = getClientInfo(request)

    await logAdminAction(
      adminUser.id,
      'delete_customer',
      'customer',
      undefined,
      { customer_id },
      clientInfo.ipAddress,
      clientInfo.userAgent
    )

    return NextResponse.json(data, { status: result.status })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}
