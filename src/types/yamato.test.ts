import {
  YamatoApiConfig,
  YamatoShippingRequest,
  YamatoApiResponseItem,
  YamatoApiResponse,
} from './yamato';

describe('YamatoApiConfig Interface', () => {
  it('should have all required fields', () => {
    const config: YamatoApiConfig = {
      apiKey: 'api-key-123',
      apiSecret: 'api-secret-456',
      baseUrl: 'https://api.yamato.co.jp',
      timeout: 30000,
    };

    expect(config.apiKey).toBe('api-key-123');
    expect(config.apiSecret).toBe('api-secret-456');
    expect(config.baseUrl).toBe('https://api.yamato.co.jp');
    expect(config.timeout).toBe(30000);
  });

  it('should support optional timeout', () => {
    const config: YamatoApiConfig = {
      apiKey: 'api-key-123',
      apiSecret: 'api-secret-456',
      baseUrl: 'https://api.yamato.co.jp',
    };

    expect(config.timeout).toBeUndefined();
  });
});

describe('YamatoShippingRequest Interface', () => {
  it('should have all required fields', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1, 2, 3],
      sender: {
        name: 'Sender Inc',
        address: '100 Business Ave',
        phone: '0123-456-7890',
      },
      recipients: [
        {
          order_id: 1,
          name: 'Customer 1',
          address: '123 Main St',
          phone: '0123-456-7890',
        },
        {
          order_id: 2,
          name: 'Customer 2',
          address: '456 Oak Ave',
        },
      ],
      delivery_type: 'normal',
      payment_type: 'sender',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.sender.name).toBe('Sender Inc');
    expect(request.sender.address).toBe('100 Business Ave');
    expect(request.sender.phone).toBe('0123-456-7890');
    expect(request.recipients.length).toBe(2);
    expect(request.recipients[0].order_id).toBe(1);
    expect(request.delivery_type).toBe('normal');
    expect(request.payment_type).toBe('sender');
  });

  it('should support all delivery types', () => {
    const types: YamatoShippingRequest['delivery_type'][] = ['normal', 'cool', 'frozen'];
    types.forEach((type) => {
      const request: YamatoShippingRequest = {
        order_ids: [1],
        sender: {
          name: 'Sender',
          address: 'Address',
          phone: '123',
        },
        recipients: [
          {
            order_id: 1,
            name: 'Customer',
            address: 'Address',
          },
        ],
        delivery_type: type,
        payment_type: 'sender',
      };
      expect(request.delivery_type).toBe(type);
    });
  });

  it('should support all payment types', () => {
    const types: YamatoShippingRequest['payment_type'][] = ['sender', 'recipient', 'collect'];
    types.forEach((type) => {
      const request: YamatoShippingRequest = {
        order_ids: [1],
        sender: {
          name: 'Sender',
          address: 'Address',
          phone: '123',
        },
        recipients: [
          {
            order_id: 1,
            name: 'Customer',
            address: 'Address',
          },
        ],
        delivery_type: 'normal',
        payment_type: type,
      };
      expect(request.payment_type).toBe(type);
    });
  });

  it('should support optional notes', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1],
      sender: {
        name: 'Sender',
        address: 'Address',
        phone: '123',
      },
      recipients: [
        {
          order_id: 1,
          name: 'Customer',
          address: 'Address',
        },
      ],
      delivery_type: 'normal',
      payment_type: 'sender',
      notes: 'Handle with care',
    };

    expect(request.notes).toBe('Handle with care');
  });
});

describe('YamatoApiResponseItem Interface', () => {
  it('should have all required fields', () => {
    const item: YamatoApiResponseItem = {
      order_id: 1,
      success: true,
      tracking_number: 'TRK-123456789',
      label_url: 'https://example.com/label.pdf',
    };

    expect(item.order_id).toBe(1);
    expect(item.success).toBe(true);
    expect(item.tracking_number).toBe('TRK-123456789');
    expect(item.label_url).toBe('https://example.com/label.pdf');
  });

  it('should support error response', () => {
    const item: YamatoApiResponseItem = {
      order_id: 2,
      success: false,
      error_code: 'INVALID_ORDER',
      error_message: 'Order not found',
    };

    expect(item.order_id).toBe(2);
    expect(item.success).toBe(false);
    expect(item.error_code).toBe('INVALID_ORDER');
    expect(item.error_message).toBe('Order not found');
  });
});

describe('YamatoApiResponse Interface', () => {
  it('should have success field', () => {
    const response: YamatoApiResponse = {
      success: true,
    };

    expect(response.success).toBe(true);
  });

  it('should support batch response', () => {
    const response: YamatoApiResponse = {
      success: true,
      results: [
        {
          order_id: 1,
          success: true,
          tracking_number: 'TRK-001',
          label_url: 'https://example.com/label1.pdf',
        },
        {
          order_id: 2,
          success: true,
          tracking_number: 'TRK-002',
          label_url: 'https://example.com/label2.pdf',
        },
      ],
      batch_id: 'BATCH-123',
      total_cost: 3000,
    };

    expect(response.success).toBe(true);
    expect(response.results.length).toBe(2);
    expect(response.batch_id).toBe('BATCH-123');
    expect(response.total_cost).toBe(3000);
  });

  it('should support error response', () => {
    const response: YamatoApiResponse = {
      success: false,
      error_message: 'API rate limit exceeded',
    };

    expect(response.success).toBe(false);
    expect(response.error_message).toBe('API rate limit exceeded');
  });
});
