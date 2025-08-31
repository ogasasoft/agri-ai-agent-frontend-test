import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRF token is required', 403);
    }

    const { customerIds } = await request.json();

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return createErrorResponse('削除する顧客IDを指定してください。', 400);
    }

    // Validate all customer IDs are numbers
    const validIds = customerIds.filter(id => typeof id === 'number' && !isNaN(id));
    if (validIds.length !== customerIds.length) {
      return createErrorResponse('無効な顧客IDが含まれています。', 400);
    }

    const client = await getDbClient();
    try {
      // Check which customers exist
      const placeholders = validIds.map((_, index) => `$${index + 1}`).join(',');
      const customerCheck = await client.query(
        `SELECT id, email FROM users WHERE id IN (${placeholders}) AND is_active = true`,
        validIds
      );

      const existingCustomers = customerCheck.rows;
      const existingIds = existingCustomers.map(c => c.id);
      const notFoundIds = validIds.filter(id => !existingIds.includes(id));

      if (existingIds.length === 0) {
        return createErrorResponse('指定された顧客は見つかりませんでした。', 404);
      }

      // Begin transaction
      await client.query('BEGIN');

      try {
        let deletedCount = 0;

        for (const customerId of existingIds) {
          // Delete related data for each customer
          await client.query('DELETE FROM orders WHERE user_id = $1', [customerId]);
          await client.query('DELETE FROM categories WHERE user_id = $1', [customerId]);
          await client.query('DELETE FROM sessions WHERE user_id = $1', [customerId]);
          await client.query('DELETE FROM remember_tokens WHERE user_id = $1', [customerId]);
          
          // Delete the user
          const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [customerId]);
          if (deleteResult.rowCount && deleteResult.rowCount > 0) {
            deletedCount++;
          }
        }

        await client.query('COMMIT');

        // Log admin action
        await client.query(
          `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            adminUser.id,
            'BULK_DELETE_CUSTOMERS',
            JSON.stringify({
              requestedIds: customerIds,
              deletedIds: existingIds,
              notFoundIds: notFoundIds,
              deletedCount: deletedCount,
              customers: existingCustomers.map(c => ({ id: c.id, email: c.email }))
            }),
            request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            request.headers.get('user-agent') || 'unknown'
          ]
        );

        const response = NextResponse.json({
          success: true,
          message: `${deletedCount}人の顧客が正常に削除されました。`,
          deletedCount,
          notFoundCount: notFoundIds.length,
          notFoundIds
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
    console.error('Bulk delete customers error:', error);
    return createErrorResponse('顧客の一括削除に失敗しました。', 500);
  }
}