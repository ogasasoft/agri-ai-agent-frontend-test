/**
 * Type definition tests for src/types
 *
 * These tests verify that TypeScript types are correctly defined and
 * can be used as expected. Since we're testing type definitions only,
 * we'll use TypeScript's type-checking and verify basic type constraints.
 */

import type {
  Order,
  OrderItem,
  OrderFilters,
  OrderStats,
  ShippingLabel,
  YamatoApiResponse,
  ShippingRequest,
  CustomerRegistration,
  YamatoApiConfig,
  YamatoShippingRequest,
  YamatoApiResponseItem,
} from '@/types';

describe('Order Type', () => {
  it('should have all required properties', () => {
    const order: Order = {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'Test Customer',
      customer_phone: '0123-456-7890',
      customer_address: '123 Test St',
      total_amount: 1000,
      order_date: '2024-01-01',
      status: 'pending',
      has_memo: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(order.id).toBe(1);
    expect(order.order_number).toBe('ORD-001');
    expect(order.customer_name).toBe('Test Customer');
    expect(order.customer_phone).toBe('0123-456-7890');
    expect(order.customer_address).toBe('123 Test St');
    expect(order.total_amount).toBe(1000);
    expect(order.order_date).toBe('2024-01-01');
    expect(order.status).toBe('pending');
    expect(order.has_memo).toBe(false);
  });

  it('should allow optional properties', () => {
    const order: Order = {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'Test Customer',
      total_amount: 1000,
      order_date: '2024-01-01',
      status: 'pending',
      has_memo: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(order.customer_phone).toBeUndefined();
    expect(order.customer_address).toBeUndefined();
    expect(order.delivery_date).toBeUndefined();
    expect(order.memo).toBeUndefined();
    expect(order.ec_source).toBeUndefined();
    expect(order.shipped_at).toBeUndefined();
    expect(order.tracking_number).toBeUndefined();
  });

  it('should support all status values', () => {
    const statuses: Array<Order['status']> = ['pending', 'processing', 'shipped', 'delivered'];

    statuses.forEach((status) => {
      const order: Order = {
        id: 1,
        order_number: `ORD-001-${status}`,
        customer_name: 'Test',
        total_amount: 100,
        order_date: '2024-01-01',
        status,
        has_memo: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(order.status).toBe(status);
    });
  });
});

describe('OrderItem Type', () => {
  it('should have all required properties', () => {
    const item: OrderItem = {
      id: 1,
      order_id: 1,
      product_name: 'Product A',
      quantity: 2,
      unit_price: 500,
    };

    expect(item.id).toBe(1);
    expect(item.order_id).toBe(1);
    expect(item.product_name).toBe('Product A');
    expect(item.quantity).toBe(2);
    expect(item.unit_price).toBe(500);
  });
});

describe('OrderFilters Type', () => {
  it('should have all required properties', () => {
    const filters: OrderFilters = {
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      status: 'all',
      hasDeliveryDate: 'all',
      hasMemo: 'all',
    };

    expect(filters.dateFrom).toBe('2024-01-01');
    expect(filters.dateTo).toBe('2024-12-31');
    expect(filters.status).toBe('all');
    expect(filters.hasDeliveryDate).toBe('all');
    expect(filters.hasMemo).toBe('all');
  });

  it('should support all status values', () => {
    const statuses: Array<OrderFilters['status']> = ['all', 'pending', 'processing', 'shipped', 'delivered'];
    statuses.forEach((status) => {
      const filters: OrderFilters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        status,
        hasDeliveryDate: 'all',
        hasMemo: 'all',
      };
      expect(filters.status).toBe(status);
    });
  });
});

describe('OrderStats Type', () => {
  it('should have all required properties', () => {
    const stats: OrderStats = {
      total: 10,
      pending: 2,
      processing: 3,
      shipped: 4,
      delivered: 1,
      totalAmount: 5000,
    };

    expect(stats.total).toBe(10);
    expect(stats.pending).toBe(2);
    expect(stats.processing).toBe(3);
    expect(stats.shipped).toBe(4);
    expect(stats.delivered).toBe(1);
    expect(stats.totalAmount).toBe(5000);
  });
});

describe('ShippingLabel Type', () => {
  it('should have all required properties', () => {
    const label: ShippingLabel = {
      id: 'label-001',
      order_code: 'ORD-001',
      customer_name: 'Test Customer',
      customer_address: '123 Test St',
      delivery_date: '2024-02-01',
      tracking_number: 'TRK123456789',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(label.id).toBe('label-001');
    expect(label.order_code).toBe('ORD-001');
    expect(label.customer_name).toBe('Test Customer');
    expect(label.customer_address).toBe('123 Test St');
    expect(label.delivery_date).toBe('2024-02-01');
    expect(label.tracking_number).toBe('TRK123456789');
    expect(label.created_at).toBe('2024-01-01T00:00:00Z');
  });

  it('should allow optional delivery_date and tracking_number', () => {
    const label: ShippingLabel = {
      id: 'label-001',
      order_code: 'ORD-001',
      customer_name: 'Test Customer',
      customer_address: '123 Test St',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(label.delivery_date).toBeUndefined();
    expect(label.tracking_number).toBeUndefined();
  });
});

describe('YamatoApiResponse Type', () => {
  it('should have all required properties', () => {
    const response: YamatoApiResponse = {
      success: true,
      tracking_number: 'TRK123456789',
      label_url: 'https://example.com/label.pdf',
    };

    expect(response.success).toBe(true);
    expect(response.tracking_number).toBe('TRK123456789');
    expect(response.label_url).toBe('https://example.com/label.pdf');
    expect(response.error_message).toBeUndefined();
  });

  it('should allow optional fields', () => {
    const response: YamatoApiResponse = {
      success: true,
    };

    expect(response.tracking_number).toBeUndefined();
    expect(response.label_url).toBeUndefined();
    expect(response.error_message).toBeUndefined();
  });

  it('should handle error response', () => {
    const response: YamatoApiResponse = {
      success: false,
      error_message: 'API error occurred',
    };

    expect(response.success).toBe(false);
    expect(response.error_message).toBe('API error occurred');
    expect(response.tracking_number).toBeUndefined();
    expect(response.label_url).toBeUndefined();
  });
});

describe('ShippingRequest Type', () => {
  it('should have all required properties', () => {
    const request: ShippingRequest = {
      order_ids: [1, 2, 3],
      delivery_type: 'normal',
      notes: 'Please deliver carefully',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.delivery_type).toBe('normal');
    expect(request.notes).toBe('Please deliver carefully');
  });

  it('should allow optional notes', () => {
    const request: ShippingRequest = {
      order_ids: [1, 2, 3],
      delivery_type: 'cool',
    };

    expect(request.notes).toBeUndefined();
  });
});

describe('CustomerRegistration Type', () => {
  it('should have all required properties', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-001',
      customer_name: 'Test Customer',
      customer_phone: '0123-456-7890',
      customer_address: '123 Test St',
      delivery_date: '2024-02-01',
      total_amount: 1000,
      memo: 'Special delivery instructions',
    };

    expect(registration.order_code).toBe('ORD-001');
    expect(registration.customer_name).toBe('Test Customer');
    expect(registration.customer_phone).toBe('0123-456-7890');
    expect(registration.customer_address).toBe('123 Test St');
    expect(registration.delivery_date).toBe('2024-02-01');
    expect(registration.total_amount).toBe(1000);
    expect(registration.memo).toBe('Special delivery instructions');
  });

  it('should allow optional customer_phone and customer_address', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-001',
      customer_name: 'Test Customer',
      total_amount: 1000,
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(registration.customer_phone).toBeUndefined();
    expect(registration.customer_address).toBeUndefined();
    expect(registration.delivery_date).toBeUndefined();
    expect(registration.memo).toBeUndefined();
  });
});

describe('YamatoApiConfig Type', () => {
  it('should have all required properties', () => {
    const config: YamatoApiConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.yamato.co.jp',
      timeout: 30000,
    };

    expect(config.apiKey).toBe('test-api-key');
    expect(config.apiSecret).toBe('test-api-secret');
    expect(config.baseUrl).toBe('https://api.yamato.co.jp');
    expect(config.timeout).toBe(30000);
  });
});

describe('YamatoShippingRequest Type', () => {
  it('should have all required properties', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1, 2, 3],
      sender: {
        name: 'Sender Name',
        address: '123 Sender St',
        phone: '0123-456-7890',
      },
      recipients: [
        {
          order_id: 1,
          name: 'Recipient 1',
          address: '123 Recipient 1 St',
          phone: '0987-654-3210',
          delivery_date: '2024-02-01',
        },
        {
          order_id: 2,
          name: 'Recipient 2',
          address: '456 Recipient 2 St',
        },
      ],
      delivery_type: 'cool',
      payment_type: 'sender',
      notes: 'Please deliver carefully',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.sender.name).toBe('Sender Name');
    expect(request.sender.address).toBe('123 Sender St');
    expect(request.sender.phone).toBe('0123-456-7890');
    expect(request.recipients).toHaveLength(2);
    expect(request.recipients[0].order_id).toBe(1);
    expect(request.recipients[0].name).toBe('Recipient 1');
    expect(request.delivery_type).toBe('cool');
    expect(request.payment_type).toBe('sender');
    expect(request.notes).toBe('Please deliver carefully');
  });

  it('should allow optional notes', () => {
    const request: YamatoShippingRequest = {
      order_ids: [1, 2, 3],
      sender: {
        name: 'Sender Name',
        address: '123 Sender St',
        phone: '0123-456-7890',
      },
      recipients: [],
      delivery_type: 'normal',
      payment_type: 'sender',
    };

    expect(request.notes).toBeUndefined();
  });
});

describe('YamatoApiResponseItem Type', () => {
  it('should have all required properties', () => {
    const item: YamatoApiResponseItem = {
      order_id: 1,
      success: true,
      tracking_number: 'TRK123456789',
      label_url: 'https://example.com/label.pdf',
    };

    expect(item.order_id).toBe(1);
    expect(item.success).toBe(true);
    expect(item.tracking_number).toBe('TRK123456789');
    expect(item.label_url).toBe('https://example.com/label.pdf');
    expect(item.error_code).toBeUndefined();
    expect(item.error_message).toBeUndefined();
  });

  it('should allow optional error fields', () => {
    const item: YamatoApiResponseItem = {
      order_id: 1,
      success: false,
      error_code: 'INVALID_ORDER',
      error_message: 'Order not found',
    };

    expect(item.success).toBe(false);
    expect(item.error_code).toBe('INVALID_ORDER');
    expect(item.error_message).toBe('Order not found');
    expect(item.tracking_number).toBeUndefined();
    expect(item.label_url).toBeUndefined();
  });
});
