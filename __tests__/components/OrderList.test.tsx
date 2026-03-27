// FILE: __tests__/components/OrderList.test.tsx
/**
 * Tests for OrderList component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderList } from '@/components/OrderList';
import type { Order } from '@/types/order';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-circle-icon" className={className} />
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <svg data-testid="message-square-icon" className={className} />
  ),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, fmt: string) => {
    // Return a deterministic formatted date
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }),
}));

jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// Factory for creating mock orders
function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    order_number: 'ORD-001',
    customer_name: 'テスト顧客',
    customer_phone: '090-1234-5678',
    customer_address: '東京都渋谷区1-1-1',
    total_amount: 5000,
    order_date: '2024-03-01',
    delivery_date: undefined,
    status: 'pending',
    has_memo: false,
    memo: undefined,
    ec_source: 'shop',
    shipped_at: undefined,
    tracking_number: undefined,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
    ...overrides,
  };
}

const mockOrders: Order[] = [
  createMockOrder({ id: 1, order_number: 'ORD-001', customer_name: '山田太郎', total_amount: 3000, status: 'pending' }),
  createMockOrder({ id: 2, order_number: 'ORD-002', customer_name: '鈴木花子', total_amount: 7500, status: 'processing' }),
  createMockOrder({ id: 3, order_number: 'ORD-003', customer_name: '佐藤次郎', total_amount: 12000, status: 'shipped' }),
];

describe('OrderList', () => {
  let onSelectionChangeMock: jest.Mock;

  beforeEach(() => {
    onSelectionChangeMock = jest.fn();
  });

  describe('Empty state', () => {
    it('renders empty state message when no orders', () => {
      render(
        <OrderList
          orders={[]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText('該当する注文がありません')).toBeInTheDocument();
    });

    it('renders alert icon in empty state', () => {
      render(
        <OrderList
          orders={[]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('does not render the order list header in empty state', () => {
      render(
        <OrderList
          orders={[]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.queryByText(/すべて選択/)).not.toBeInTheDocument();
    });
  });

  describe('Order rendering', () => {
    it('renders the "select all" header with order count', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText(`すべて選択 (${mockOrders.length}件)`)).toBeInTheDocument();
    });

    it('renders order numbers for all orders', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
      expect(screen.getByText('ORD-003')).toBeInTheDocument();
    });

    it('renders customer names for all orders', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('鈴木花子')).toBeInTheDocument();
      expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
    });

    it('renders formatted order dates', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      // Each order has order_date '2024-03-01' which should be formatted
      const dateLabels = screen.getAllByText(/注文日:/);
      expect(dateLabels.length).toBe(mockOrders.length);
    });

    it('renders delivery date when present', () => {
      const orderWithDelivery = createMockOrder({
        id: 4,
        order_number: 'ORD-004',
        delivery_date: '2024-03-15',
      });

      render(
        <OrderList
          orders={[orderWithDelivery]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText(/希望日:/)).toBeInTheDocument();
    });

    it('does not render delivery date when absent', () => {
      const orderWithoutDelivery = createMockOrder({
        id: 4,
        order_number: 'ORD-004',
        delivery_date: undefined,
      });

      render(
        <OrderList
          orders={[orderWithoutDelivery]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.queryByText(/希望日:/)).not.toBeInTheDocument();
    });
  });

  describe('Status badges', () => {
    it('shows pending status badge for pending orders', () => {
      const pendingOrder = createMockOrder({ id: 1, status: 'pending' });

      render(
        <OrderList
          orders={[pendingOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const badge = screen.getByText('未処理');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    it('shows processing status badge for processing orders', () => {
      const processingOrder = createMockOrder({ id: 2, status: 'processing' });

      render(
        <OrderList
          orders={[processingOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const badge = screen.getByText('処理中');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.className).toContain('text-blue-800');
    });

    it('shows shipped status badge for shipped orders', () => {
      const shippedOrder = createMockOrder({ id: 3, status: 'shipped' });

      render(
        <OrderList
          orders={[shippedOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const badge = screen.getByText('発送済');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    it('shows delivered status badge for delivered orders', () => {
      const deliveredOrder = createMockOrder({ id: 4, status: 'delivered' });

      render(
        <OrderList
          orders={[deliveredOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const badge = screen.getByText('配達完了');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-gray-100');
      expect(badge.className).toContain('text-gray-800');
    });

    it('shows default gray badge for unknown status', () => {
      const unknownOrder = createMockOrder({ id: 5, status: 'pending' });
      // Temporarily override the status via cast
      (unknownOrder as any).status = 'unknown';

      render(
        <OrderList
          orders={[unknownOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const badge = screen.getByText('unknown');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-gray-100');
    });
  });

  describe('Amount display', () => {
    it('formats amount in Japanese Yen format', () => {
      const order = createMockOrder({ id: 1, total_amount: 5000 });

      render(
        <OrderList
          orders={[order]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      // Japanese yen format may render as ¥5,000 or ￥5,000 depending on environment
      const formattedAmount = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(5000);
      expect(screen.getByText(formattedAmount)).toBeInTheDocument();
    });
  });

  describe('Memo indicator', () => {
    it('shows memo icon when order has memo', () => {
      const orderWithMemo = createMockOrder({ id: 1, has_memo: true, memo: 'Some note' });

      render(
        <OrderList
          orders={[orderWithMemo]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByTestId('message-square-icon')).toBeInTheDocument();
    });

    it('does not show memo icon when order has no memo', () => {
      const orderWithoutMemo = createMockOrder({ id: 1, has_memo: false });

      render(
        <OrderList
          orders={[orderWithoutMemo]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.queryByTestId('message-square-icon')).not.toBeInTheDocument();
    });
  });

  describe('Checkbox selection', () => {
    it('renders unchecked checkbox for unselected orders', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // First is "select all", rest are individual orders
      const orderCheckboxes = checkboxes.slice(1);
      orderCheckboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });

    it('renders checked checkbox for selected orders', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={['1', '2']}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const orderCheckboxes = checkboxes.slice(1);
      expect(orderCheckboxes[0]).toBeChecked();
      expect(orderCheckboxes[1]).toBeChecked();
      expect(orderCheckboxes[2]).not.toBeChecked();
    });

    it('calls onSelectionChange with order added when checkbox is checked', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // first order checkbox

      expect(onSelectionChangeMock).toHaveBeenCalledWith(['1']);
    });

    it('calls onSelectionChange with order removed when checkbox is unchecked', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={['1', '2']}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // first order checkbox (currently checked)

      expect(onSelectionChangeMock).toHaveBeenCalledWith(['2']);
    });
  });

  describe('Select all functionality', () => {
    it('selects all orders when select-all checkbox is checked', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // select all checkbox

      expect(onSelectionChangeMock).toHaveBeenCalledWith(
        expect.arrayContaining(['1', '2', '3'])
      );
    });

    it('deselects all orders from current list when select-all is unchecked', () => {
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={['1', '2', '3']}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // The selectAll state starts at false, so first click selects all (checked=true)
      // then second click deselects (checked=false)
      fireEvent.click(checkboxes[0]); // checked -> true (selects all)
      fireEvent.click(checkboxes[0]); // checked -> false (deselects all)

      // Last call should be deselect (empty for IDs in this list)
      const lastCall = onSelectionChangeMock.mock.calls[onSelectionChangeMock.mock.calls.length - 1][0];
      // selectedOrders passed as prop is ['1','2','3'], after deselect all those are removed
      expect(lastCall).toEqual([]);
    });

    it('preserves selections from other lists when deselecting all', () => {
      // selectedOrders includes IDs from another list (e.g. '99')
      render(
        <OrderList
          orders={mockOrders}
          selectedOrders={['1', '2', '3', '99']}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // First click selects all (adds current list IDs to selectedOrders prop)
      // Second click deselects all (removes current list IDs, keeps '99')
      fireEvent.click(checkboxes[0]); // select all
      fireEvent.click(checkboxes[0]); // deselect all

      const lastCall = onSelectionChangeMock.mock.calls[onSelectionChangeMock.mock.calls.length - 1][0];
      // After deselect, only '99' (from another list) should remain
      expect(lastCall).toEqual(['99']);
    });
  });

  describe('Shipping info display', () => {
    it('does not show shipping info by default (showShippingInfo=false)', () => {
      const orderWithShipping = createMockOrder({
        id: 1,
        customer_address: '東京都渋谷区1-1-1',
        shipped_at: '2024-03-10',
        tracking_number: 'YMT123456789',
      });

      render(
        <OrderList
          orders={[orderWithShipping]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.queryByText(/住所:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/発送日:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/追跡番号:/)).not.toBeInTheDocument();
    });

    it('shows customer address when showShippingInfo is true', () => {
      const orderWithAddress = createMockOrder({
        id: 1,
        customer_address: '東京都渋谷区1-1-1',
      });

      render(
        <OrderList
          orders={[orderWithAddress]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
          showShippingInfo={true}
        />
      );

      expect(screen.getByText(/住所: 東京都渋谷区1-1-1/)).toBeInTheDocument();
    });

    it('shows shipped date when showShippingInfo is true and shipped_at is set', () => {
      const orderShipped = createMockOrder({
        id: 1,
        shipped_at: '2024-03-10',
        status: 'shipped',
      });

      render(
        <OrderList
          orders={[orderShipped]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
          showShippingInfo={true}
        />
      );

      expect(screen.getByText(/発送日:/)).toBeInTheDocument();
    });

    it('shows tracking number when showShippingInfo is true and tracking_number is set', () => {
      const orderWithTracking = createMockOrder({
        id: 1,
        shipped_at: '2024-03-10',
        tracking_number: 'YMT123456789',
        status: 'shipped',
      });

      render(
        <OrderList
          orders={[orderWithTracking]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
          showShippingInfo={true}
        />
      );

      expect(screen.getByText(/追跡番号: YMT123456789/)).toBeInTheDocument();
    });

    it('does not show shipped date when shipped_at is not set even with showShippingInfo', () => {
      const orderNotShipped = createMockOrder({
        id: 1,
        shipped_at: undefined,
        tracking_number: undefined,
      });

      render(
        <OrderList
          orders={[orderNotShipped]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
          showShippingInfo={true}
        />
      );

      expect(screen.queryByText(/発送日:/)).not.toBeInTheDocument();
    });
  });

  describe('Single order rendering', () => {
    it('renders a single order correctly', () => {
      const singleOrder = createMockOrder({
        id: 10,
        order_number: 'ORD-SINGLE',
        customer_name: 'Single Customer',
        total_amount: 999,
        status: 'pending',
      });

      render(
        <OrderList
          orders={[singleOrder]}
          selectedOrders={[]}
          onSelectionChange={onSelectionChangeMock}
        />
      );

      expect(screen.getByText('ORD-SINGLE')).toBeInTheDocument();
      expect(screen.getByText('Single Customer')).toBeInTheDocument();
      expect(screen.getByText('すべて選択 (1件)')).toBeInTheDocument();
    });
  });
});
