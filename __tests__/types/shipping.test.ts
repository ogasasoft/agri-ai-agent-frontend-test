/**
 * Type definitions tests for shipping-related types
 */
import { ShippingLabel, YamatoApiResponse, ShippingRequest, CustomerRegistration } from '@/types/shipping';

describe('ShippingLabel type', () => {
  it('should have all required fields', () => {
    const label: ShippingLabel = {
      id: 'lbl-001',
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      customer_address: '123 Main St',
      delivery_date: '2026-03-30T07:00:00.000Z',
      tracking_number: 'TRK-123456',
      created_at: '2026-03-28T07:00:00.000Z',
    };

    expect(label.id).toBe('lbl-001');
    expect(label.order_code).toBe('ORD-001');
    expect(label.customer_name).toBe('John Doe');
    expect(label.customer_address).toBe('123 Main St');
    expect(label.delivery_date).toBe('2026-03-30T07:00:00.000Z');
    expect(label.tracking_number).toBe('TRK-123456');
    expect(label.created_at).toBe('2026-03-28T07:00:00.000Z');
  });

  it('should accept optional fields', () => {
    const label: ShippingLabel = {
      id: 'lbl-001',
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      customer_address: '123 Main St',
      created_at: '2026-03-28T07:00:00.000Z',
    };

    expect(label.delivery_date).toBeUndefined();
    expect(label.tracking_number).toBeUndefined();
  });
});

describe('YamatoApiResponse type', () => {
  it('should have success field', () => {
    const response: YamatoApiResponse = {
      success: true,
      tracking_number: 'TRK-123456',
      label_url: 'https://example.com/label.pdf',
    };

    expect(response.success).toBe(true);
  });

  it('should accept error_message', () => {
    const response: YamatoApiResponse = {
      success: false,
      error_message: 'API key not found',
    };

    expect(response.success).toBe(false);
    expect(response.error_message).toBe('API key not found');
  });

  it('should accept both success and error fields', () => {
    const response: YamatoApiResponse = {
      success: true,
      tracking_number: 'TRK-123456',
      label_url: 'https://example.com/label.pdf',
    };

    expect(response.success).toBe(true);
    expect(response.tracking_number).toBe('TRK-123456');
    expect(response.error_message).toBeUndefined();
  });
});

describe('ShippingRequest type', () => {
  it('should have all required fields', () => {
    const request: ShippingRequest = {
      order_ids: [1, 2, 3],
      delivery_type: 'normal',
      notes: 'Handle with care',
    };

    expect(request.order_ids).toEqual([1, 2, 3]);
    expect(request.delivery_type).toBe('normal');
    expect(request.notes).toBe('Handle with care');
  });

  it('should accept delivery_type values', () => {
    const types: Array<ShippingRequest['delivery_type']> = ['normal', 'cool', 'frozen'];

    types.forEach((type) => {
      const request: ShippingRequest = {
        order_ids: [1],
        delivery_type: type,
      };

      expect(request.delivery_type).toBe(type);
    });
  });

  it('should allow optional notes', () => {
    const request: ShippingRequest = {
      order_ids: [1],
      delivery_type: 'normal',
    };

    expect(request.notes).toBeUndefined();
  });
});

describe('CustomerRegistration type', () => {
  it('should have all required fields', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      customer_phone: '123-456-7890',
      customer_address: '123 Main St',
      delivery_date: '2026-03-30T07:00:00.000Z',
      total_amount: 1000,
      memo: 'Test memo',
    };

    expect(registration.order_code).toBe('ORD-001');
    expect(registration.customer_name).toBe('John Doe');
    expect(registration.customer_phone).toBe('123-456-7890');
    expect(registration.customer_address).toBe('123 Main St');
    expect(registration.delivery_date).toBe('2026-03-30T07:00:00.000Z');
    expect(registration.total_amount).toBe(1000);
    expect(registration.memo).toBe('Test memo');
  });

  it('should accept optional fields', () => {
    const registration: CustomerRegistration = {
      order_code: 'ORD-001',
      customer_name: 'John Doe',
      total_amount: 1000,
    };

    expect(registration.customer_phone).toBeUndefined();
    expect(registration.customer_address).toBeUndefined();
    expect(registration.delivery_date).toBeUndefined();
    expect(registration.memo).toBeUndefined();
  });
});
