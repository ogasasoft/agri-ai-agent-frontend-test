'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import Papa from 'papaparse';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    processFiles(newFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx']
    },
    multiple: true
  });

  const processFiles = async (files: UploadFile[]) => {
    setIsUploading(true);

    for (const uploadFile of files) {
      try {
        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id ? { ...f, progress } : f
            )
          );
        }

        // Parse CSV
        const csvData = await parseCSV(uploadFile.file);
        
        // Process and save to database
        await processCSVData(csvData);

        // Mark as success
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'success' as const }
              : f
          )
        );
      } catch (error) {
        console.error(`Error processing file ${uploadFile.file.name}:`, error);
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : '処理中にエラーが発生しました'
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV解析エラー: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(new Error(`CSV読み込みエラー: ${error.message}`));
        }
      });
    });
  };

  const processCSVData = async (data: any[]) => {
    const orders = data.map((row, index) => {
      // CSV columns mapping - adjust based on your CSV format
      return {
        order_number: row['注文番号'] || row['order_number'] || `CSV-${Date.now()}-${index}`,
        customer_name: row['顧客名'] || row['customer_name'] || '',
        customer_phone: row['電話番号'] || row['phone'] || '',
        customer_address: row['住所'] || row['address'] || '',
        total_amount: parseInt(row['金額'] || row['amount'] || '0'),
        order_date: row['注文日'] || row['order_date'] || new Date().toISOString().split('T')[0],
        delivery_date: row['希望配達日'] || row['delivery_date'] || '',
        memo: row['備考'] || row['memo'] || '',
        status: 'pending'
      };
    });

    // Save to database via API
    for (const order of orders) {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order)
      });

      if (!response.ok) {
        throw new Error(`注文 ${order.order_number} の保存に失敗しました`);
      }
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">CSV アップロード</h1>
          <p className="text-sm text-gray-600 mt-1">
            注文データのCSVファイルをドラッグ&ドロップまたはクリックでアップロード
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            
            {isDragActive ? (
              <p className="text-lg text-primary-600">ファイルをここにドロップしてください</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  CSVファイルをドラッグ&ドロップまたはクリックして選択
                </p>
                <p className="text-sm text-gray-500">
                  対応形式: .csv, .xls, .xlsx
                </p>
              </div>
            )}
          </div>

          {/* CSV Format Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">期待されるCSV形式</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 注文番号（必須）</p>
              <p>• 顧客名（必須）</p>
              <p>• 電話番号</p>
              <p>• 住所</p>
              <p>• 金額（必須）</p>
              <p>• 注文日（必須、YYYY-MM-DD形式）</p>
              <p>• 希望配達日（YYYY-MM-DD形式）</p>
              <p>• 備考</p>
            </div>
          </div>

          {/* File list */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">アップロードファイル</h3>
              
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                >
                  {getFileIcon(uploadFile.status)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(uploadFile.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {uploadFile.status === 'success' && (
                      <p className="text-xs text-green-600">アップロード完了</p>
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <p className="text-xs text-red-600">{uploadFile.error}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Processing status */}
          {isUploading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="text-sm font-medium text-yellow-800">
                  ファイルを処理中...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}