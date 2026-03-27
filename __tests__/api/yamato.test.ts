/** @jest-environment node */

// FILE: __tests__/api/yamato.test.ts

import { POST } from '@/app/api/yamato/route';
import { createMockRequest } from '../setup/test-utils';

// Use fake timers to skip the 1500ms setTimeout in generateMockYamatoResponse
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Call POST and concurrently flush all pending timers using runAllTimersAsync.
 * This correctly handles the async await new Promise(resolve => setTimeout(...))
 * pattern inside generateMockYamatoResponse.
 */
async function callPost(request: any): Promise<Response> {
  const responsePromise = POST(request);
  await jest.runAllTimersAsync();
  return responsePromise;
}

// Minimal valid YamatoShippingRequest payload builder
function buildYamatoRequest(overrides: Partial<{
  order_ids: number[];
  recipients: Array<{
    order_id: number;
    name: string;
    address: string;
    phone?: string;
    delivery_date?: string;
  }>;
  delivery_type: 'normal' | 'cool' | 'frozen';
  payment_type: 'sender' | 'recipient' | 'collect';
  notes?: string;
}> = {}) {
  return {
    order_ids: overrides.order_ids ?? [1, 2],
    sender: {
      name: '農園太郎',
      address: '東京都渋谷区1-1-1',
      phone: '03-1234-5678',
    },
    recipients: overrides.recipients ?? [
      {
        order_id: 1,
        name: '田中花子',
        address: '大阪府大阪市2-2-2',
        phone: '06-9876-5432',
        delivery_date: '2024-02-01',
      },
      {
        order_id: 2,
        name: '鈴木一郎',
        address: '愛知県名古屋市3-3-3',
      },
    ],
    delivery_type: overrides.delivery_type ?? ('normal' as const),
    payment_type: overrides.payment_type ?? ('sender' as const),
    notes: overrides.notes,
  };
}

describe('/api/yamato', () => {
  describe('POST /api/yamato', () => {
    it('should return 200 with results array for valid shipping request', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest(),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should return one result per recipient', async () => {
      const recipients = [
        { order_id: 10, name: '顧客A', address: '東京都1-1' },
        { order_id: 11, name: '顧客B', address: '大阪府2-2' },
        { order_id: 12, name: '顧客C', address: '福岡県3-3' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [10, 11, 12], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.results.length).toBe(3);
    });

    it('should map each result to the correct order_id', async () => {
      const recipients = [
        { order_id: 100, name: '顧客X', address: '北海道1-1' },
        { order_id: 200, name: '顧客Y', address: '沖縄県2-2' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [100, 200], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      const orderIds = data.results.map((r: any) => r.order_id);
      expect(orderIds).toContain(100);
      expect(orderIds).toContain(200);
    });

    it('should return results with required fields per item', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest(),
      });

      const response = await callPost(request);
      const data = await response.json();

      data.results.forEach((item: any) => {
        expect(item).toHaveProperty('order_id');
        expect(item).toHaveProperty('success');
        expect(item).toHaveProperty('tracking_number');
        expect(item).toHaveProperty('label_url');
      });
    });

    it('should return a batch_id starting with BATCH_', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest(),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data).toHaveProperty('batch_id');
      expect(typeof data.batch_id).toBe('string');
      expect(data.batch_id).toMatch(/^BATCH_/);
    });

    it('should return total_cost of 1600 when all 2 recipients succeed (800 each)', async () => {
      // Mock Math.random to always return 0.5 → success = (0.5 > 0.1) = true
      // error_code path: (0.5 > 0.9) = false → no error_code
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const recipients = [
        { order_id: 1, name: '顧客A', address: '東京都1-1' },
        { order_id: 2, name: '顧客B', address: '大阪府2-2' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [1, 2], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.total_cost).toBe(1600);

      mockRandom.mockRestore();
    });

    it('should include label_url containing the order_id', async () => {
      const recipients = [
        { order_id: 55, name: '顧客テスト', address: '東京都テスト区1-1' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [55], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.results[0].label_url).toContain('55');
      expect(data.results[0].label_url).toMatch(/^https:\/\/mock-yamato\.com\/labels\//);
    });

    it('should handle a single recipient', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({
          order_ids: [99],
          recipients: [{ order_id: 99, name: '単一顧客', address: '東京都1-1' }],
        }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.length).toBe(1);
      expect(data.results[0].order_id).toBe(99);
    });

    it('should return success: false and total_cost 0 when all recipients fail', async () => {
      // Math.random = 0 → success = (0 > 0.1) = false, error_code = (0 > 0.9) = false
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0);

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest(),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.total_cost).toBe(0);

      mockRandom.mockRestore();
    });

    it('should return success: true when at least one recipient succeeds', async () => {
      // Recipient 1: random 0 → fail; Recipient 2: random 0.5 → success
      // Each recipient uses random twice: once for success, once for error_code
      const mockRandom = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0)    // recipient 1 success check → fail
        .mockReturnValueOnce(0)    // recipient 1 error_code check
        .mockReturnValueOnce(0.5)  // recipient 2 success check → succeed
        .mockReturnValueOnce(0.5); // recipient 2 error_code check

      const recipients = [
        { order_id: 1, name: '失敗顧客', address: '東京都1-1' },
        { order_id: 2, name: '成功顧客', address: '大阪府2-2' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [1, 2], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.success).toBe(true);

      mockRandom.mockRestore();
    });

    it('should handle cool delivery type without error', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ delivery_type: 'cool' }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
    });

    it('should handle frozen delivery type with collect payment', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({
          delivery_type: 'frozen',
          payment_type: 'collect',
          notes: '冷凍品・代引き',
        }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('results');
    });

    it('should return 500 with error response when request body is invalid JSON', async () => {
      // Parsing fails before setTimeout is reached, so no timer advancement needed
      const request = new Request('http://localhost:3000/api/yamato', {
        method: 'POST',
        body: '{ broken json :::',
        headers: { 'Content-Type': 'application/json' },
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.results).toEqual([]);
      expect(data).toHaveProperty('error_message');
    });

    it('should return descriptive error_message string on parse failure', async () => {
      const request = new Request('http://localhost:3000/api/yamato', {
        method: 'POST',
        body: 'totally invalid',
        headers: { 'Content-Type': 'application/json' },
      }) as any;

      const response = await POST(request);
      const data = await response.json();

      expect(typeof data.error_message).toBe('string');
      expect(data.error_message.length).toBeGreaterThan(0);
    });

    it('should include error_code and error_message fields on items with random > 0.9', async () => {
      // Force the error path: success random = 0.95 (>0.1 → success=true), error_code random = 0.95 (>0.9 → has error)
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.95);

      const recipients = [
        { order_id: 77, name: '顧客エラー', address: '東京都テスト区1-1' },
      ];

      const request = createMockRequest({
        method: 'POST',
        body: buildYamatoRequest({ order_ids: [77], recipients }),
      });

      const response = await callPost(request);
      const data = await response.json();

      expect(data.results[0].error_code).toBe('INVALID_ADDRESS');
      expect(data.results[0].error_message).toBe('住所が不正です');

      mockRandom.mockRestore();
    });
  });
});
