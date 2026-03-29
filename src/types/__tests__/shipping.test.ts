import {
  ShippingLabel,
  YamatoApiResponse,
  ShippingRequest,
  CustomerRegistration,
} from './shipping';

describe('ShippingLabel Interface', () => {
  it('should have all required fields', () => {
    const label: ShippingLabel = {
      id: 'label-001',
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      customer_address: '123 Main St',
      created_at: '2026-03-28T00:00:00Z',
    };

    expect(label.id).toBe('label-001');
    expect(label.order_code).toBe('ORD-001');
    expect(label.customer_name).toBe('John Doe');
    expect(label.customer_address).toBe('123 Main St');
    expect(label.created_at).toBe('2026-03-28T00:00:00Z');
  });

  it('should support optional fields', () => {
    const label: ShippingLabel = {
      id: 'label-002',
      order_code: 'ORD-002',
      customer_name: 'Jane Doe',
      customer_address: '456 Oak Ave',
      delivery_date: '2026-04-01',
      tracking_number: 'TRK-123456789',
      created_at: '2026-03-28T00:00:00Z',
    };

    expect(label.delivery_date).toBe('2026-04-01');
    expect(label.tracking_number).toBe('TRK-123456789');
  });
});

describe('YamatoApiResponse Interface', () => {
  it('should have success field', () => {
    const response: YamatoApiResponse = {
      success: true,
    };

    expect(response.success).toBe(true);
  });

  it('should support successful response', () => {
    const response: YamatoApiResponse = {
      success: true,
      tracking_number: 'TRK-123456789',
      label_url: 'https://example.com/label.pdf',
    };

    expect(response.success).toBe(true);
    expect(response.tracking_number).toBe('TRK-123456789');
    expect(response.label_url).toBe('https://example.com/label.pdf');
  });

  it('should support error response', () => {
    const response: YamatoApiResponse = {
      success: false,
      error_message: 'Invalid API credentials',
    };

    expect(response.success).toBe(false);
    expect(response.error_message).toBe('Invalid API credentials');
  });
});

describe('ShippingRequest Interface', () => {
  it('should have all required fields', () => {
    const request: ShippingRequest = {
      order_ids: [1, 2, 3],
      delivery_type: 'normal',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.delivery_type).toBe('normal');
    expect(request.notes).toBeUndefined();
  });

  it('should support optional notes', () => {
    const request: ShippingRequest = {
      order_ids: [1, 2, 3],
      delivery_type: 'cool',
      notes: 'Handle with care',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.delivery_type).toBe('cool');
    expect(request.notes).toBe('Handle with care');
  });

  it('should support all delivery types', () => {
    const types: ShippingRequest['delivery_type'][] = ['normal', 'cool', 'frozen'];
    types.forEach((type) => {
      const request: ShippingRequest = {
        order_ids: [1],
        delivery_type: type,
      };
      expect(request.delivery_type).toBe(type);
    });
  });
});

describe('CustomerRegistration Interface', () => {
  it('should have all required fields', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      customer_phone: '0123-456-7890',
      customer_address: '123 Main St',
      total_amount: 1000,
    };

    expect(registration.order_code).toBe('ORD-001');
    expect(registration.customer_name).toBe('John Doe');
    expect(registration.customer_phone).toBe('0123-456-7890');
    expect(registration.customer_address).toBe('123 Main St');
    expect(registration.total_amount).toBe(1000);
  });

  it('should support optional fields', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-002',
      customer_name: 'Jane Doe',
      customer_address: '456 Oak Ave',
      total_amount: 500,
    };

    expect(registration.customer_phone).toBeUndefined();
    expect(registration.delivery_date).toBeUndefined();
    expect(registration.memo).toBeUndefined();
  });
});
