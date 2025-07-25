'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OrderConfirmation from '@/components/OrderConfirmation';

export default function RegisterConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const orderType = searchParams.get('type') as 'manual' | 'csv' | null;

  useEffect(() => {
    // セッションストレージから注文データを取得
    const savedData = sessionStorage.getItem('pendingOrderData');
    if (savedData) {
      setOrderData(JSON.parse(savedData));
    } else {
      // データがない場合は選択画面に戻る
      router.push('/orders/register/choose');
    }
  }, [router]);

  const handleConfirm = async () => {
    if (!orderData || !orderType) return;
    
    setIsSubmitting(true);
    
    try {
      if (orderType === 'csv') {
        // CSV一括登録
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orders: orderData }),
        });

        if (!response.ok) {
          throw new Error('CSV登録に失敗しました');
        }
      } else {
        // 手動登録
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          throw new Error('注文登録に失敗しました');
        }
      }

      // 成功時はセッションストレージをクリアして完了画面へ
      sessionStorage.removeItem('pendingOrderData');
      router.push(`/orders/register/complete?type=${orderType}`);
      
    } catch (error) {
      console.error('Registration error:', error);
      alert('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (orderType === 'csv') {
      router.push('/upload');
    } else {
      router.push('/orders/new');
    }
  };

  if (!orderData || !orderType) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <OrderConfirmation
      orderData={orderData}
      orderType={orderType}
      onConfirm={handleConfirm}
      onBack={handleBack}
      isSubmitting={isSubmitting}
    />
  );
}