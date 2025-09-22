'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Upload, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { detectAndConvertEncoding } from '@/lib/csv-encoding';

interface ParsedCSVData {
  file: File;
  headers: string[];
  rows: Record<string, string>[];
  allData: Record<string, string>[];
}

export default function UploadPage() {
  const router = useRouter();
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ブラウザのデフォルトのドラッグ&ドロップ動作を防止
  useEffect(() => {
    const preventDefaultDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventDefaultDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // dropzoneエリア外でのドロップは何もしない
    };

    // document全体でドラッグ&ドロップのデフォルト動作を防止
    document.addEventListener('dragenter', preventDefaultDrag, false);
    document.addEventListener('dragover', preventDefaultDrag, false);
    document.addEventListener('drop', preventDefaultDrop, false);

    return () => {
      document.removeEventListener('dragenter', preventDefaultDrag, false);
      document.removeEventListener('dragover', preventDefaultDrag, false);
      document.removeEventListener('drop', preventDefaultDrop, false);
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      parseFileForPreview(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx']
    },
    multiple: false,
    preventDropOnDocument: true, // ドキュメント全体でのドロップを防止
    noClick: false,
    noKeyboard: false
  });

  const parseFileForPreview = async (file: File) => {
    setIsProcessing(true);

    try {
      // エンコーディング自動検出・変換
      const buffer = await file.arrayBuffer();
      const encodingResult = detectAndConvertEncoding(buffer);

      if (encodingResult.hasGarbledText || encodingResult.confidence < 0.3) {
        alert(`文字エンコーディングの問題が検出されました。\n検出されたエンコーディング: ${encodingResult.detectedEncoding}\n信頼度: ${Math.round(encodingResult.confidence * 100)}%\n\nCSVファイルをUTF-8で保存し直すか、正しいエンコーディングで保存してください。`);
        setIsProcessing(false);
        return;
      }

      const text = encodingResult.text;

      const parseResult = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        alert(`CSV解析エラー: ${parseResult.errors[0].message}`);
        return;
      }

      const headers = parseResult.meta?.fields || [];
      const allData = parseResult.data;
      const rows = allData.slice(0, 10); // 最初の10行のみプレビュー

      setParsedData({
        file,
        headers,
        rows,
        allData
      });
      setShowPreview(true);
    } catch (error) {
      alert(`ファイル読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedData) return;

    // CSVデータを変換して注文データ形式に
    const orderData = parsedData.allData.map((row, index) => ({
      order_number: row['注文番号'] || row['order_number'] || `CSV-${Date.now()}-${index + 1}`,
      customer_name: row['顧客名'] || row['customer_name'] || '',
      customer_phone: row['電話番号'] || row['phone'] || '',
      customer_address: row['住所'] || row['address'] || '',
      total_amount: parseInt(row['金額'] || row['amount'] || '0'),
      order_date: row['注文日'] || row['order_date'] || new Date().toISOString().split('T')[0],
      delivery_date: row['配達希望日'] || row['delivery_date'] || '',
      status: (row['ステータス'] || row['status'] || 'pending') as 'pending' | 'processing' | 'shipped' | 'delivered',
      memo: row['備考'] || row['memo'] || '',
    }));

    // セッションストレージに保存
    sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData));
    
    // 確認画面に遷移
    router.push('/orders/register/confirm?type=csv');
  };

  const cancelPreview = () => {
    setParsedData(null);
    setShowPreview(false);
  };

  if (showPreview && parsedData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">CSVプレビュー</h1>
            <p className="text-sm text-gray-600 mt-1">
              {parsedData.allData.length} 件のデータを読み込みました（最初の10件を表示）
            </p>
          </div>

          {/* Preview Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {parsedData.headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-gray-200">
                      {parsedData.headers.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                        >
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedData.allData.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                その他 {parsedData.allData.length - 10} 件のデータがあります
              </p>
            )}

            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">📋 データ概要</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• 合計件数: {parsedData.allData.length} 件</p>
                <p>• 列数: {parsedData.headers.length} 列</p>
                <p>• ファイル名: {parsedData.file.name}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={cancelPreview}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="btn-primary flex items-center gap-2"
            >
              確認画面へ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">CSVアップロード</h1>
          </div>
          <p className="text-sm text-gray-600">
            CSVファイルをアップロードして注文データを一括登録します
          </p>
        </div>

        {/* Upload Area */}
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }
              ${isProcessing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center">
              <Upload className={`w-12 h-12 mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              
              {isProcessing ? (
                <>
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-lg font-medium text-gray-700">ファイルを処理中...</p>
                </>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-primary-600">ファイルをここにドロップしてください</p>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    CSVファイルをドラッグ&ドロップ
                  </p>
                  <p className="text-sm text-gray-500 mb-4">または</p>
                  <button className="btn-primary">
                    ファイルを選択
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📝 CSVファイルの形式</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 対応形式: CSV (.csv), Excel (.xls, .xlsx)</p>
              <p>• 1行目はヘッダー行として認識されます</p>
              <p>• 推奨列名: 注文番号, 顧客名, 電話番号, 住所, 金額, 注文日, 配達希望日, 備考</p>
              <p>• 最大ファイルサイズ: 10MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}