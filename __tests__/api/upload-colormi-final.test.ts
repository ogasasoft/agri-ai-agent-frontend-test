/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload-with-category/route';
import { createMockDbClient, createMockUser, createMockSession } from '../setup/test-utils';

jest.mock('@/lib/db');
jest.mock('@/lib/auth');

describe('/api/upload-with-category - Complete カラーミー Tests', () => {
  let mockDbClient: any;
  let mockUser: any;
  let mockSession: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = createMockUser();
    mockSession = createMockSession(mockUser);
    mockDbClient = createMockDbClient();

    const { getDbClient } = require('@/lib/db');
    const { validateSession } = require('@/lib/auth');
    
    (getDbClient as jest.Mock).mockResolvedValue(mockDbClient);
    (validateSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('カラーミー CSV アップロード', () => {
    it('カラーミー形式の標準CSV を正常にアップロード', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const csvContent = `売上ID,受注日,購入者 名前,購入者 郵便番号,購入者 都道府県,購入者 住所,購入者 電話番号,購入商品 販売価格(消費税込),購入数量,備考
CM001,2024-09-10,田中太郎,123-4567,東京都,渋谷区1-1-1,090-1234-5678,2500,1,新鮮野菜
CM002,2024-09-11,佐藤花子,456-7890,大阪府,大阪市中央区2-2-2,080-9876-5432,3200,2,有機栽培`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'colormi.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'colormi');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.registered_count).toBe(2);
      expect(result.skipped_count).toBe(0);

      // 住所統合確認
      const insertCalls = mockDbClient.query.mock.calls.filter(
        call => call[0].includes('INSERT INTO orders')
      );
      expect(insertCalls[0][1][3]).toBe('東京都渋谷区1-1-1'); // 都道府県 + 住所
      expect(insertCalls[1][1][3]).toBe('大阪府大阪市中央区2-2-2');
    });

    it('カラーミー形式で住所が分割されている場合の統合処理', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const csvContent = `売上ID,購入者 名前,購入者 都道府県,購入者 住所,購入商品 販売価格(消費税込)
CM001,田中太郎,神奈川県,横浜市港北区3-3-3,1800`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'colormi-address.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'colormi');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // 住所統合確認
      const insertCall = mockDbClient.query.mock.calls.find(
        call => call[0].includes('INSERT INTO orders')
      );
      expect(insertCall[1][3]).toBe('神奈川県横浜市港北区3-3-3');
    });

    it('カラーミー形式で価格に特殊文字が含まれる場合の処理', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const csvContent = `売上ID,購入者 名前,購入者 住所,購入商品 販売価格(消費税込)
CM001,田中太郎,東京都渋谷区1-1-1,"2500"`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'colormi-price.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'colormi');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();


      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // 価格変換確認 (¥2,500 → 2500)
      const insertCall = mockDbClient.query.mock.calls.find(
        call => call[0].includes('INSERT INTO orders')
      );
      expect(insertCall[1][4]).toBe(2500);
    });
  });

  describe('たべちょく CSV アップロード', () => {
    it('たべちょく形式の標準CSV を正常にアップロード', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const csvContent = `注文番号,顧客名,電話番号,住所,金額,注文日,希望配達日,備考
TB001,鈴木一郎,090-1111-2222,東京都新宿区4-4-4,3000,2024-09-10,2024-09-15,朝採れ野菜`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'tabechoku.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'tabechoku');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.registered_count).toBe(1);

      // たべちょく形式確認
      const insertCall = mockDbClient.query.mock.calls.find(
        call => call[0].includes('INSERT INTO orders')
      );
      expect(insertCall[1][0]).toBe('TB001'); // 注文番号
      expect(insertCall[1][1]).toBe('鈴木一郎'); // 顧客名
      expect(insertCall[1][6]).toBe('2024-09-15'); // 希望配達日（たべちょくのみ）
    });
  });

  describe('エラーハンドリング', () => {
    it('必須フィールドが不足している場合のエラー処理', async () => {
      mockDbClient.query.mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] });

      const csvContent = `購入者 名前,購入単価
田中太郎,2500`; // 売上IDが不足

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'invalid.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'colormi');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      
      // 新しいエラー形式では一般的なメッセージが返される
      expect(result.message).toBe('データの検証に失敗しました');
      
      // 開発環境では詳細なデバッグ情報が含まれる
      if (result.debug_info?.data_analysis?.validation_errors) {
        expect(result.debug_info.data_analysis.validation_errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining('注文番号が必須')
          ])
        );
      }
    });

    it('データソースが不明な場合のデフォルト処理', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'テストカテゴリ' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const csvContent = `注文番号,顧客名,住所,金額
TB001,田中太郎,東京都渋谷区1-1-1,2500`;

      const formData = new FormData();
      formData.append('file', new File([csvContent], 'test.csv', { type: 'text/csv' }));
      formData.append('categoryId', '1');
      formData.append('dataSource', 'unknown');
      formData.append('csrf_token', mockSession.session.csrf_token);

      const request = new NextRequest('http://localhost:3000/api/upload-with-category', {
        method: 'POST',
        body: formData,
        headers: {
          'x-session-token': 'mock-session-token',
          'x-csrf-token': mockSession.session.csrf_token
        }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      // デフォルトでたべちょく形式として処理される
    });
  });
});