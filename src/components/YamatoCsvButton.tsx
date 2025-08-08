'use client';

import { useState } from 'react';
import { FileDown, Truck, CheckCircle, XCircle } from 'lucide-react';
import type { Order } from '@/types/order';

interface YamatoCsvButtonProps {
  selectedOrders: Order[];
  onCsvGenerated?: (orderIds: number[]) => void;
  disabled?: boolean;
}

interface CsvGenerationResult {
  success: boolean;
  csv?: string;
  filename?: string;
  order_count?: number;
  message?: string;
}

export default function YamatoCsvButton({ 
  selectedOrders, 
  onCsvGenerated,
  disabled 
}: YamatoCsvButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<CsvGenerationResult | null>(null);

  const downloadCsv = (csvContent: string, filename: string) => {
    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;
    
    const blob = new Blob([csvWithBom], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const generateYamatoCsv = async () => {
    if (!selectedOrders || selectedOrders.length === 0) {
      setResult({
        success: false,
        message: '注文を選択してください'
      });
      setShowResult(true);
      return;
    }

    setGenerating(true);
    setShowResult(false);

    try {
      const orderIds = selectedOrders.map(order => order.id);
      
      const response = await fetch('/api/yamato-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': document.cookie.split('session_token=')[1]?.split(';')[0] || '',
          'x-csrf-token': document.cookie.split('csrf_token=')[1]?.split(';')[0] || '',
        },
        body: JSON.stringify({ orderIds })
      });

      const data = await response.json();

      if (data.success && data.csv) {
        // CSVをダウンロード
        downloadCsv(data.csv, data.filename || 'yamato_b2.csv');
        
        setResult({
          success: true,
          order_count: data.order_count,
          filename: data.filename,
          message: `${data.order_count}件の注文データをCSVでダウンロードしました`
        });

        // コールバック実行
        if (onCsvGenerated) {
          onCsvGenerated(orderIds);
        }
      } else {
        setResult({
          success: false,
          message: data.message || 'CSVの生成に失敗しました'
        });
      }
    } catch (error) {
      console.error('CSV generation error:', error);
      setResult({
        success: false,
        message: 'ネットワークエラーが発生しました'
      });
    } finally {
      setGenerating(false);
      setShowResult(true);
    }
  };

  const isDisabled = disabled || generating || !selectedOrders || selectedOrders.length === 0;

  return (
    <div className="relative">
      <button
        onClick={generateYamatoCsv}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span>CSV生成中...</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>ヤマトB2 CSV</span>
            {selectedOrders && selectedOrders.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">
                {selectedOrders.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* 結果表示モーダル */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {result.success ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">CSV生成完了</h3>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-gray-900">エラー</h3>
                </>
              )}
            </div>
            
            <p className="text-gray-700 mb-4">
              {result.message}
            </p>

            {result.success && result.filename && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm font-medium">次の手順</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  1. ダウンロードしたCSVをヤマトB2クラウドにアップロード<br />
                  2. 伝票を印刷して発送準備<br />
                  3. 発送完了後、下記の確認画面で発送済みに移動
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              {result.success && (
                <button
                  onClick={() => {
                    setShowResult(false);
                    if (onCsvGenerated) {
                      onCsvGenerated(selectedOrders.map(order => order.id));
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  発送確認画面へ
                </button>
              )}
              <button
                onClick={() => setShowResult(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}