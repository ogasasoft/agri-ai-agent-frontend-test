'use client';

import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { Order } from '@/types/order';

interface ExportModalProps {
  selectedOrders: string[];
  orders: Order[];
  onClose: () => void;
}

export function ExportModal({ selectedOrders, orders, onClose }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'yamato' | 'sagawa' | 'custom'>('yamato');
  const [isExporting, setIsExporting] = useState(false);

  const selectedOrderData = orders.filter(order => 
    selectedOrders.includes(order.id.toString())
  );

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let csvContent = '';
      
      switch (exportFormat) {
        case 'yamato':
          csvContent = generateYamatoB2CSV(selectedOrderData);
          break;
        case 'sagawa':
          csvContent = generateSagawaCSV(selectedOrderData);
          break;
        case 'custom':
          csvContent = generateCustomCSV(selectedOrderData);
          break;
      }
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `delivery_labels_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const generateYamatoB2CSV = (orders: Order[]): string => {
    const headers = [
      'お客様管理番号',
      'サービス',
      'お届け先郵便番号',
      'お届け先住所',
      'お届け先アパートマンション名',
      'お届け先会社・部門名１',
      'お届け先会社・部門名２',
      'お届け先名',
      'お届け先名（カナ）',
      'お届け先電話番号',
      'お届け日',
      'お届け時間帯',
      '荷物の個数',
      '商品名１',
      '商品名２'
    ];
    
    const rows = orders.map(order => [
      order.order_number,
      '宅急便',
      '', // 郵便番号 - マスク済みのため空
      order.customer_address || '',
      '',
      '',
      '',
      order.customer_name,
      '',
      order.customer_phone || '',
      order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0].replace(/-/g, '/') : '',
      '',
      '1',
      '農産物',
      ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };

  const generateSagawaCSV = (orders: Order[]): string => {
    const headers = [
      '顧客コード',
      'お届け先名称',
      'お届け先住所',
      'お届け先電話番号',
      'お届け日',
      '荷物の個数',
      '品名'
    ];
    
    const rows = orders.map(order => [
      order.order_number,
      order.customer_name,
      order.customer_address || '',
      order.customer_phone || '',
      order.delivery_date || '',
      '1',
      '農産物'
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };

  const generateCustomCSV = (orders: Order[]): string => {
    const headers = [
      '注文番号',
      '顧客名',
      '住所',
      '電話番号',
      '注文日',
      '到着希望日',
      '金額',
      'ステータス',
      '備考'
    ];
    
    const rows = orders.map(order => [
      order.order_number,
      order.customer_name,
      order.customer_address || '',
      order.customer_phone || '',
      order.order_date,
      order.delivery_date || '',
      order.total_amount.toString(),
      order.status,
      order.memo || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">CSV エクスポート</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              選択された {selectedOrderData.length} 件の注文をエクスポートします
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-1">選択中の注文</div>
              <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                {selectedOrderData.map(order => (
                  <div key={order.id}>{order.order_number} - {order.customer_name}</div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              エクスポート形式
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="yamato"
                  checked={exportFormat === 'yamato'}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">ヤマト B2 クラウド外部取込形式</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="sagawa"
                  checked={exportFormat === 'sagawa'}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">佐川急便形式</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="custom"
                  checked={exportFormat === 'custom'}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">汎用形式</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'エクスポート中...' : 'ダウンロード'}
          </button>
        </div>
      </div>
    </div>
  );
}