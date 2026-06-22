import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { validateAdminSession, logAdminAction, getClientInfo } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session-token') || request.cookies.get('session_token')?.value
    const adminUser = await validateAdminSession(token || '')

    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: '認証が必要です。' },
        { status: 401 }
      )
    }

    const clientInfo = getClientInfo(request)

    await logAdminAction(
      adminUser.id,
      'view_dashboard_stats',
      'dashboard',
      undefined,
      {},
      clientInfo.ipAddress,
      clientInfo.userAgent
    )

    // Get system statistics from backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    try {
      const result = await fetch(`${apiUrl}/api/admin/dashboard/stats`, {
        headers: {
          'x-session-token': token || ''
        },
        cache: 'no-store'
      })

      if (!result.ok) {
        throw new Error(`Backend API returned ${result.status}`)
      }

      const data = await result.json()

      return NextResponse.json(data)
    } catch (backendError) {
      console.error('Error fetching dashboard stats from backend:', backendError)

      // Return default stats structure if backend is unavailable
      const now = new Date()
      const lastBackup = now.toISOString()

      return NextResponse.json({
        success: true,
        stats: {
          totalUsers: 0,
          totalOrders: 0,
          totalCustomers: 0,
          activeIntegrations: 0,
          todayOrders: 0,
          weeklyGrowth: 0,
          systemHealth: 'degraded',
          lastBackup,
          statusStats: {
            users: 'healthy',
            orders: 'healthy',
            database: 'healthy',
            integrations: 'healthy'
          }
        }
      })
    }
  } catch (error) {
    console.error('Error in dashboard stats route:', error)
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました。' },
      { status: 500 }
    )
  }
}
