import { Order, OrderItem, OrderFilters, OrderStats } from './order';

describe('Order Interface', () => {
  it('should have all required fields', () => {
    const order: Order = {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'John Doe',
      total_amount: 1000,
      order_date: '2026-03-28',
      status: 'pending',
      has_memo: true,
      memo: 'Test memo',
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    };

    expect(order.id).toBe(1);
    expect(order.order_number).toBe('ORD-001');
    expect(order.customer_name).toBe('John Doe');
    expect(order.status).toBe('pending');
    expect(order.has_memo).toBe(true);
  });

  it('should support optional fields', () => {
    const order: Order = {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'Jane Doe',
      total_amount: 500,
      order_date: '2026-03-28',
      status: 'shipped',
      has_memo: false,
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    };

    expect(order.customer_phone).toBeUndefined();
    expect(order.customer_address).toBeUndefined();
    expect(order.delivery_date).toBeUndefined();
    expect(order.memo).toBeUndefined();
  });

  it('should support all status values', () => {
    const statuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered'];

    statuses.forEach((status) => {
      const order: Order = {
        id: 1,
        order_number: `ORD-${status}`,
        customer_name: 'Test',
        total_amount: 100,
        order_date: '2026-03-28',
        status,
        has_memo: false,
        created_at: '2026-03-28T00:00:00Z',
        updated_at: '2026-03-28T00:00:00Z',
      };
      expect(order.status).toBe(status);
    });
  });
});

describe('OrderItem Interface', () => {
  it('should have all required fields', () => {
    const item: OrderItem = {
      id: 1,
      order_id: 100,
      product_name: 'Apple',
      quantity: 10,
      unit_price: 100,
    };

    expect(item.id).toBe(1);
    expect(item.order_id).toBe(100);
    expect(item.product_name).toBe('Apple');
    expect(item.quantity).toBe(10);
    expect(item.unit_price).toBe(100);
  });

  it('should calculate total correctly', () => {
    const item: OrderItem = {
      id: 1,
      order_id: 100,
      product_name: 'Banana',
      quantity: 5,
      unit_price: 50,
    };

    expect(item.quantity * item.unit_price).toBe(250);
  });
});

describe('OrderFilters Interface', () => {
  it('should have all required fields', () => {
    const filters: OrderFilters = {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      status: 'all',
      hasDeliveryDate: 'all',
      hasMemo: 'all',
    };

    expect(filters.dateFrom).toBe('2026-03-01');
    expect(filters.dateTo).toBe('2026-03-31');
    expect(filters.status).toBe('all');
    expect(filters.hasDeliveryDate).toBe('all');
    expect(filters.hasMemo).toBe('all');
  });

  it('should support all status filter values', () => {
    const statusFilters: OrderFilters['status'][] = [
      'all',
      'pending',
      'processing',
      'shipped',
      'delivered',
    ];
    statusFilters.forEach((status) => {
      const filters: OrderFilters = {
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        status,
        hasDeliveryDate: 'all',
        hasMemo: 'all',
      };
      expect(filters.status).toBe(status);
    });
  });

  it('should support all hasDeliveryDate filter values', () => {
    const dateFilters: OrderFilters['hasDeliveryDate'][] = ['all', 'yes', 'no'];
    dateFilters.forEach((filter) => {
      const filters: OrderFilters = {
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        status: 'all',
        hasDeliveryDate: filter,
        hasMemo: 'all',
      };
      expect(filters.hasDeliveryDate).toBe(filter);
    });
  });

  it('should support all hasMemo filter values', () => {
    const memoFilters: OrderFilters['hasMemo'][] = ['all', 'yes', 'no'];
    memoFilters.forEach((filter) => {
      const filters: OrderFilters = {
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        status: 'all',
        hasDeliveryDate: 'all',
        hasMemo: filter,
      };
      expect(filters.hasMemo).toBe(filter);
    });
  });
});

describe('OrderStats Interface', () => {
  it('should have all required fields', () => {
    const stats: OrderStats = {
      total: 100,
      pending: 10,
      processing: 20,
      shipped: 30,
      delivered: 40,
      totalAmount: 10000,
    };

    expect(stats.total).toBe(100);
    expect(stats.pending).toBe(10);
    expect(stats.processing).toBe(20);
    expect(stats.shipped).toBe(30);
    expect(stats.delivered).toBe(40);
    expect(stats.totalAmount).toBe(10000);
  });

  it('should sum to total when all counts are included', () => {
    const stats: OrderStats = {
      total: 100,
      pending: 10,
      processing: 20,
      shipped: 30,
      delivered: 40,
      totalAmount: 10000,
    };

    expect(stats.pending + stats.processing + stats.shipped + stats.delivered).toBe(stats.total);
  });
});
