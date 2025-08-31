import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, isSuperAdmin } from '@/lib/admin-auth';
import { getDbClient } from '@/lib/db';
import { addSecurityHeaders, createErrorResponse } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  try {
    const sessionToken = request.headers.get('x-session-token') || 
                         request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return createErrorResponse('認証が必要です。', 401);
    }

    const adminUser = await validateAdminSession(sessionToken);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return createErrorResponse('スーパー管理者権限が必要です。', 403);
    }

    // CSRF token validation
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      return createErrorResponse('CSRF token is required', 403);
    }

    const integrationId = parseInt(params.integrationId);
    if (isNaN(integrationId)) {
      return createErrorResponse('無効な統合設定IDです。', 400);
    }

    const client = await getDbClient();
    try {
      // Get integration details
      const integrationQuery = await client.query(
        'SELECT id, name, type, api_endpoint, api_key, settings, is_active FROM api_integrations WHERE id = $1',
        [integrationId]
      );

      if (integrationQuery.rows.length === 0) {
        return createErrorResponse('統合設定が見つかりません。', 404);
      }

      const integration = integrationQuery.rows[0];

      if (!integration.is_active) {
        return createErrorResponse('無効な統合設定です。まず統合設定を有効にしてください。', 400);
      }

      let syncResult = {
        success: false,
        message: '',
        syncedRecords: 0,
        errors: [] as string[],
        duration: 0
      };

      const startTime = Date.now();

      try {
        if (integration.type === 'colormi') {
          // Sync ColorMi orders
          const ordersResponse = await fetch(`${integration.api_endpoint}/api/orders`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            
            // Process and sync orders to database
            let syncedCount = 0;
            for (const order of ordersData.orders || []) {
              try {
                // Insert or update order in database
                await client.query(
                  `INSERT INTO orders (
                    order_code, customer_name, customer_email, product_name,
                    quantity, unit_price, total_amount, order_date,
                    integration_id, integration_order_id, user_id, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                  ON CONFLICT (integration_order_id, integration_id) 
                  DO UPDATE SET 
                    customer_name = EXCLUDED.customer_name,
                    customer_email = EXCLUDED.customer_email,
                    product_name = EXCLUDED.product_name,
                    quantity = EXCLUDED.quantity,
                    unit_price = EXCLUDED.unit_price,
                    total_amount = EXCLUDED.total_amount,
                    order_date = EXCLUDED.order_date,
                    updated_at = NOW()`,
                  [
                    order.orderNumber,
                    order.customerName,
                    order.customerEmail,
                    order.productName,
                    order.quantity,
                    order.unitPrice,
                    order.totalAmount,
                    new Date(order.orderDate),
                    integrationId,
                    order.id,
                    adminUser.id // Use admin user as default
                  ]
                );
                syncedCount++;
              } catch (orderError: any) {
                syncResult.errors.push(`注文 ${order.orderNumber}: ${orderError.message}`);
              }
            }

            syncResult.success = true;
            syncResult.syncedRecords = syncedCount;
            syncResult.message = `ColorMiから${syncedCount}件の注文を同期しました。`;

          } else {
            throw new Error(`ColorMi API error: ${ordersResponse.status}`);
          }

        } else if (integration.type === 'tabechoku') {
          // Sync Tabechoku products/orders
          const productsResponse = await fetch(`${integration.api_endpoint}/products`, {
            method: 'GET',
            headers: {
              'X-API-Key': integration.api_key,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });

          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            
            // Process and sync products
            let syncedCount = 0;
            for (const product of productsData.products || []) {
              try {
                // Insert or update product information
                await client.query(
                  `INSERT INTO orders (
                    order_code, product_name, unit_price, 
                    integration_id, integration_order_id, user_id, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                  ON CONFLICT (integration_order_id, integration_id)
                  DO UPDATE SET 
                    product_name = EXCLUDED.product_name,
                    unit_price = EXCLUDED.unit_price,
                    updated_at = NOW()`,
                  [
                    product.code,
                    product.name,
                    product.price,
                    integrationId,
                    product.id,
                    adminUser.id
                  ]
                );
                syncedCount++;
              } catch (productError: any) {
                syncResult.errors.push(`商品 ${product.name}: ${productError.message}`);
              }
            }

            syncResult.success = true;
            syncResult.syncedRecords = syncedCount;
            syncResult.message = `Tabechokuから${syncedCount}件の商品を同期しました。`;

          } else {
            throw new Error(`Tabechoku API error: ${productsResponse.status}`);
          }

        } else {
          throw new Error('サポートされていない統合タイプです。');
        }

      } catch (syncError: any) {
        syncResult.success = false;
        syncResult.message = `同期に失敗しました: ${syncError.message}`;
        syncResult.errors.push(syncError.message);
      }

      syncResult.duration = Date.now() - startTime;

      // Update last_synced timestamp
      await client.query(
        'UPDATE api_integrations SET last_synced_at = NOW() WHERE id = $1',
        [integrationId]
      );

      // Log admin action
      await client.query(
        `INSERT INTO admin_audit_logs (admin_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          adminUser.id,
          'SYNC_INTEGRATION',
          JSON.stringify({
            integrationId,
            integrationName: integration.name,
            integrationType: integration.type,
            syncResult
          }),
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      const response = NextResponse.json({
        success: syncResult.success,
        message: syncResult.message,
        syncResult,
        integration: {
          id: integrationId,
          name: integration.name,
          type: integration.type
        }
      });

      return addSecurityHeaders(response);

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('Sync integration error:', error);
    return createErrorResponse('統合設定の同期に失敗しました。', 500);
  }
}