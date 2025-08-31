import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser) {
      return createErrorResponse('管理者権限が必要です。', 403);
    }

    const customerId = parseInt(params.customerId);
    if (isNaN(customerId)) {
      return createErrorResponse('無効な顧客IDです。', 400);
    }

    const client = await getDbClient();
    try {
      // Check if customer exists
      const customerCheck = await client.query(
        'SELECT id, email FROM users WHERE id = $1 AND is_active = true',
        [customerId]
      );

      if (customerCheck.rows.length === 0) {
        return createErrorResponse('顧客が見つかりません。', 404);
      }

      const customer = customerCheck.rows[0];

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Delete related orders first (if any)
        await client.query('DELETE FROM orders WHERE user_id = $1', [customerId]);
        
        // Delete related categories (if any)
        await client.query('DELETE FROM categories WHERE user_id = $1', [customerId]);
        
        // Delete sessions
        await client.query('DELETE FROM sessions WHERE user_id = $1', [customerId]);
        
        // Delete remember tokens
        await client.query('DELETE FROM remember_tokens WHERE user_id = $1', [customerId]);
        
        // Finally delete the user
        await client.query('DELETE FROM users WHERE id = $1', [customerId]);

        await client.query('COMMIT');

        // Log admin action
        await client.query(
          `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            adminUser.id,
            'DELETE_CUSTOMER',
            JSON.stringify({
              customerId: customerId,
              customerEmail: customer.email
            }),
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            request.headers.get('user-agent') || 'unknown'
          ]
        );

        const response = NextResponse.json({
          success: true,
          message: '顧客が正常に削除されました。'
        });

        return addSecurityHeaders(response);

      } catch (deleteError) {
        await client.query('ROLLBACK');
        throw deleteError;
      }

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Delete customer error:', error);
    return createErrorResponse('顧客の削除に失敗しました。', 500);
  }
}