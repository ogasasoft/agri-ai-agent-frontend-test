'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Truck, CheckCircle, AlertCircle, X, Download, ArrowLeft } from 'lucide-react';
import type { Order } from '@/types/order';
import type { CustomerRegistration } from '@/types/shipping';
import { Suspense } from 'react';

interface ShippingResult {
  success: boolean;
  message: string;
  orders: Array<Order & { tracking_number?: string; label_url?: string }>;
  errors: string[];
  csv_content?: string;
  filename?: string;
  download_ready?: boolean;
}

function ShippingCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [shippingResult, setShippingResult] = useState<ShippingResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [orderIds, setOrderIds] = useState<number[]>([]);

  useEffect(() => {
    const orderIdsParam = searchParams.get('orderIds');
    const ids = orderIdsParam?.split(',').map(id => parseInt(id)) || [];
    setOrderIds(ids);

    if (ids.length > 0) {
      processShipping(ids);
    } else {
      router.push('/orders/shipping/pending');
    }
  }, [searchParams, router]);

  const processShipping = async (ids: number[]) => {
    try {
      setLoading(true);

      // Get authentication tokens from cookies
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0] || '';
      const csrfToken = document.cookie.split('csrf_token=')[1]?.split(';')[0] || '';

      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          order_ids: ids,
          delivery_type: 'normal',
          notes: '通常配送'
        }),
      });

      const result = await response.json();
      setShippingResult(result);

    } catch (error) {
      console.error('発送処理エラー:', error);
      setShippingResult({
        success: false,
        message: '発送処理中にエラーが発生しました',
        orders: [],
        errors: [error instanceof Error ? error.message : '不明なエラー']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (shippingResult?.orders && shippingResult.orders.length > 0) {
      setShowConfirmDialog(true);
    } else {
      router.push('/orders/shipping/pending');
    }
  };

  const handleConfirmClose = async () => {
    if (!shippingResult?.orders) return;

    setRegistering(true);

    try {
      // Get authentication tokens from cookies
      const sessionToken = document.cookie.split('session_token=')[1]?.split(';')[0] || '';

      // 顧客情報をDB登録用の形式に変換
      const customerData: CustomerRegistration[] = shippingResult.orders.map(order => ({
        order_code: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        delivery_date: order.delivery_date,
        total_amount: order.total_amount,
        memo: order.memo
      }));

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ customers: customerData }),
      });

      const result = await response.json();

      if (result.success) {
        // Customer information registration completed successfully
      } else {
        console.error('顧客情報登録エラー:', result.message);
      }

    } catch (error) {
      console.error('顧客情報登録エラー:', error);
    } finally {
      setRegistering(false);
      setShowConfirmDialog(false);
      router.push('/orders/shipping/pending');
    }
  };

  const downloadYamatoB2CSV = () => {
    if (!shippingResult?.csv_content || !shippingResult?.filename) {
      alert('CSV データが利用できません');
      return;
    }

    // Create a Blob with the CSV content
    const blob = new Blob([shippingResult.csv_content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', shippingResult.filename);
    link.style.visibility = 'hidden';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the temporary URL
    URL.revokeObjectURL(url);
  };

  const downloadLabel = (labelUrl: string, orderNumber: string) => {
    // For individual order labels, we'll use the CSV download for now
    downloadYamatoB2CSV();
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900">発送書類を作成中...</h2>
              <p className="text-gray-600 mt-2">ヤマトB2クラウド用CSVファイルを生成しています</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shippingResult) {
    return (
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900">エラーが発生しました</h2>
              <button
                onClick={() => router.push('/orders/shipping/pending')}
                className="mt-4 btn-primary"
              >
                発送対象画面に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/orders/shipping/pending')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            発送対象画面に戻る
          </button>
          <div className="flex items-center gap-3">
            {shippingResult.success ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {shippingResult.success ? '発送書類作成完了' : '発送処理エラー'}
              </h1>
              <p className="text-gray-600 mt-1">{shippingResult.message}</p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Success Results */}
          {shippingResult.success && shippingResult.orders.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">発送完了注文一覧</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {shippingResult.orders.length}件の注文が正常に発送処理されました
                    </p>
                  </div>
                  {shippingResult.download_ready && (
                    <button
                      onClick={downloadYamatoB2CSV}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      ヤマトB2 CSV ダウンロード
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {shippingResult.orders.map((order, index) => (
                  <div key={order.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            発送済み
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {order.order_number}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">顧客名</span>
                            <p className="font-medium">{order.customer_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">金額</span>
                            <p className="font-medium">¥{(order.total_amount || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">配達予定日</span>
                            <p className="font-medium">
                              {order.delivery_date || '指定なし'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">追跡番号</span>
                            <p className="font-medium text-blue-600">
                              {order.tracking_number || 'YM000000000'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => downloadLabel(
                            order.label_url || '#', 
                            order.order_number
                          )}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          CSV取得
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Results */}
          {shippingResult.errors && shippingResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">処理エラー</h3>
                  <div className="mt-2 text-sm text-red-800">
                    <ul className="space-y-1">
                      {shippingResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              完了
            </button>
          </div>
        </div>

        {/* Confirm Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">顧客情報の登録</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      画面に表示されている顧客情報をデータベースに登録しますか？
                      この操作により、発送完了した注文の顧客データが保存されます。
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="btn-secondary"
                    disabled={registering}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleConfirmClose}
                    disabled={registering}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        登録中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        登録して完了
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShippingCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-full bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    }>
      <ShippingCompleteContent />
    </Suspense>
  );
}