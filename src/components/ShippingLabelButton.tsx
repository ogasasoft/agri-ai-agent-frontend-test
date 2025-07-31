'use client';

import { useState } from 'react';
import { Truck, AlertCircle, CheckCircle } from 'lucide-react';
import { YamatoShippingRequest, YamatoApiResponse } from '@/types/yamato';

interface ShippingLabelButtonProps {
  selectedOrders: Array<{
    id: number;
    order_number: string;
    customer_name_masked: string;
    customer_address_masked?: string;
    customer_phone_masked?: string;
    delivery_date?: string;
  }>;
  onShippingComplete: (response: YamatoApiResponse) => void;
  disabled?: boolean;
  buttonText?: string;
}

export default function ShippingLabelButton({ 
  selectedOrders, 
  onShippingComplete, 
  disabled = false,
  buttonText = "発送書類作成"
}: ShippingLabelButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'normal' | 'cool' | 'frozen'>('normal');
  const [notes, setNotes] = useState('');

  const handleCreateShippingLabels = async () => {
    if (selectedOrders.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const request: YamatoShippingRequest = {
        order_ids: selectedOrders.map(order => order.id),
        sender: {
          name: '農業協同組合',
          address: '〒100-0001 東京都千代田区千代田1-1',
          phone: '03-1234-5678',
        },
        recipients: selectedOrders.map(order => ({
          order_id: order.id,
          name: order.customer_name_masked.replace(/\*/g, '●'), // マスキング解除は実際のDBから取得
          address: order.customer_address_masked || '',
          phone: order.customer_phone_masked,
          delivery_date: order.delivery_date,
        })),
        delivery_type: deliveryType,
        payment_type: 'sender',
        notes,
      };

      const response = await fetch('/api/yamato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('発送伝票作成に失敗しました');
      }

      const result: YamatoApiResponse = await response.json();
      
      onShippingComplete(result);
      setShowModal(false);
      setNotes('');
      
    } catch (error) {
      console.error('Shipping label creation error:', error);
      alert('発送伝票の作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled || selectedOrders.length === 0}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Truck className="w-4 h-4" />
        {buttonText} ({selectedOrders.length}件)
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">発送伝票作成</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  配送タイプ
                </label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as any)}
                  className="input-field w-full"
                >
                  <option value="normal">常温</option>
                  <option value="cool">冷蔵</option>
                  <option value="frozen">冷凍</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  備考
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field w-full h-20"
                  placeholder="配送に関する特記事項"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  {selectedOrders.length}件の注文の発送伝票を作成します
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={isProcessing}
                className="btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateShippingLabels}
                disabled={isProcessing}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    作成開始
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}