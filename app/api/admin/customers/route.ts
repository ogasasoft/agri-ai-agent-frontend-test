import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { validateAdminSession, logAdminAction, getClientInfo } from '@/lib/admin-auth'

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

    // Get customers with statistics
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
