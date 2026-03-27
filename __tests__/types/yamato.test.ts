/**
 * Type definitions tests for Yamato API types
 */
import {
  YamatoApiConfig,
  YamatoShippingRequest,
  YamatoApiResponseItem,
  YamatoApiResponse,
} from '@/types/yamato';

describe('YamatoApiConfig type', () => {
  it('should have all required fields', () => {
    const config: YamatoApiConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.yamato.com',
      timeout: 30000,
    };

    expect(config.apiKey).toBe('test-api-key');
    expect(config.apiSecret).toBe('test-api-secret');
    expect(config.baseUrl).toBe('https://api.yamato.com');
    expect(config.timeout).toBe(30000);
  });
});

describe('YamatoShippingRequest type', () => {
  it('should have all required fields', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1, 2, 3],
      sender: {
        name: 'John Doe',
        address: '123 Main St',
        phone: '123-456-7890',
      },
      recipients: [
        {
          order_id: 1,
          name: 'John Doe',
          address: '123 Main St',
          phone: '123-456-7890',
          delivery_date: '2026-03-30T07:00:00.000Z',
        },
      ],
      delivery_type: 'normal',
      payment_type: 'sender',
      notes: 'Test notes',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.sender.name).toBe('John Doe');
    expect(request.sender.address).toBe('123 Main St');
    expect(request.sender.phone).toBe('123-456-7890');
    expect(request.recipients).toHaveLength(1);
    expect(request.recipients[0].order_id).toBe(1);
    expect(request.recipients[0].name).toBe('John Doe');
    expect(request.recipients[0].address).toBe('123 Main St');
    expect(request.recipients[0].phone).toBe('123-456-7890');
    expect(request.recipients[0].delivery_date).toBe('2026-03-30T07:00:00.000Z');
    expect(request.delivery_type).toBe('normal');
    expect(request.payment_type).toBe('sender');
    expect(request.notes).toBe('Test notes');
  });

  it('should accept all delivery_type values', () => {
    const types: Array<YamatoShippingRequest['delivery_type']> = ['normal', 'cool', 'frozen'];

    types.forEach((type) => {
      const request: YamatoShippingRequest = {
        order_ids: [1],
        sender: { name: 'Test', address: 'Test', phone: 'Test' },
        recipients: [{ order_id: 1, name: 'Test', address: 'Test' }],
        delivery_type: type,
        payment_type: 'sender',
      };

      expect(request.delivery_type).toBe(type);
    });
  });

  it('should accept all payment_type values', () => {
    const types: Array<YamatoShippingRequest['payment_type']> = ['sender', 'recipient', 'collect'];

    types.forEach((type) => {
      const request: YamatoShippingRequest = {
        order_ids: [1],
        sender: { name: 'Test', address: 'Test', phone: 'Test' },
        recipients: [{ order_id: 1, name: 'Test', address: 'Test' }],
        delivery_type: 'normal',
        payment_type: type,
      };

      expect(request.payment_type).toBe(type);
    });
  });

  it('should allow optional notes', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1],
      sender: { name: 'Test', address: 'Test', phone: 'Test' },
      recipients: [{ order_id: 1, name: 'Test', address: 'Test' }],
      delivery_type: 'normal',
      payment_type: 'sender',
    };

    expect(request.notes).toBeUndefined();
  });
});

describe('YamatoApiResponseItem type', () => {
  it('should have all required fields', () => {
    const item: YamatoApiResponseItem = {
      order_id: 1,
      success: true,
      tracking_number: 'TRK-123456',
      label_url: 'https://example.com/label.pdf',
    };

    expect(item.order_id).toBe(1);
    expect(item.success).toBe(true);
    expect(item.tracking_number).toBe('TRK-123456');
    expect(item.label_url).toBe('https://example.com/label.pdf');
  });

  it('should accept error_code and error_message', () => {
    const item: YamatoApiResponseItem = {
      order_id: 2,
      success: false,
      error_code: 'INVALID_ADDRESS',
      error_message: 'Address not found',
    };

    expect(item.order_id).toBe(2);
    expect(item.success).toBe(false);
    expect(item.error_code).toBe('INVALID_ADDRESS');
    expect(item.error_message).toBe('Address not found');
  });

  it('should accept both success and error fields', () => {
    const item: YamatoApiResponseItem = {
      order_id: 1,
      success: true,
      tracking_number: 'TRK-123456',
    };

    expect(item.success).toBe(true);
    expect(item.tracking_number).toBe('TRK-123456');
    expect(item.error_code).toBeUndefined();
    expect(item.error_message).toBeUndefined();
  });
});

describe('YamatoApiResponse type', () => {
  it('should have success field', () => {
    const response: YamatoApiResponse = {
      success: true,
      results: [
        {
          order_id: 1,
          success: true,
          tracking_number: 'TRK-123456',
        },
      ],
    };

    expect(response.success).toBe(true);
  });

  it('should accept results array', () => {
    const response: YamatoApiResponse = {
      success: true,
      results: [
        { order_id: 1, success: true },
        { order_id: 2, success: true },
        { order_id: 3, success: true },
      ],
      batch_id: 'batch-001',
      total_cost: 1500,
    };

    expect(response.results).toHaveLength(3);
    expect(response.results[0].order_id).toBe(1);
    expect(response.results[1].order_id).toBe(2);
    expect(response.results[2].order_id).toBe(3);
    expect(response.batch_id).toBe('batch-001');
    expect(response.total_cost).toBe(1500);
  });

  it('should accept error_message', () => {
    const response: YamatoApiResponse = {
      success: false,
      error_message: 'API connection failed',
    };

    expect(response.success).toBe(false);
    expect(response.error_message).toBe('API connection failed');
  });

  it('should accept both success and error fields', () => {
    const response: YamatoApiResponse = {
      success: true,
      results: [{ order_id: 1, success: true }],
    };

    expect(response.success).toBe(true);
    expect(response.results).toHaveLength(1);
    expect(response.error_message).toBeUndefined();
  });
});
