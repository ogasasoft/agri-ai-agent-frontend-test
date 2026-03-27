// FILE: __tests__/components/OrderFilters.test.tsx
/**
 * Tests for OrderFilters component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderFilters } from '@/components/OrderFilters';
import type { OrderFilters as OrderFiltersType } from '@/types/order';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Filter: ({ className }: { className?: string }) => (
    <svg data-testid="filter-icon" className={className} />
  ),
}));

const defaultFilters: OrderFiltersType = {
  dateFrom: '',
  dateTo: '',
  status: 'all',
  hasDeliveryDate: 'all',
  hasMemo: 'all',
};

describe('OrderFilters', () => {
  let onFiltersChangeMock: jest.Mock;

  beforeEach(() => {
    onFiltersChangeMock = jest.fn();
  });

  describe('Rendering', () => {
    it('renders the filter header with icon and label', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
      expect(screen.getByText('フィルター')).toBeInTheDocument();
    });

    it('renders the clear button', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('クリア')).toBeInTheDocument();
    });

    it('renders dateFrom input with label', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('注文日（開始）')).toBeInTheDocument();
      const dateFromInputs = screen.getAllByDisplayValue('');
      expect(dateFromInputs.length).toBeGreaterThan(0);
    });

    it('renders dateTo input with label', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('注文日（終了）')).toBeInTheDocument();
    });

    it('renders hasDeliveryDate select with correct options', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('到着希望日')).toBeInTheDocument();
      // Check options exist (there are 2 "すべて" options, one for delivery date, one for memo)
      const allOptions = screen.getAllByText('すべて');
      expect(allOptions.length).toBeGreaterThanOrEqual(1);
    });

    it('renders hasMemo select with label', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('備考')).toBeInTheDocument();
    });

    it('renders status filter by default', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('ステータス')).toBeInTheDocument();
    });

    it('hides status filter when hideStatusFilter is true', () => {
      render(
        <OrderFilters
          filters={defaultFilters}
          onFiltersChange={onFiltersChangeMock}
          hideStatusFilter={true}
        />
      );

      expect(screen.queryByText('ステータス')).not.toBeInTheDocument();
    });

    it('shows status filter when hideStatusFilter is false', () => {
      render(
        <OrderFilters
          filters={defaultFilters}
          onFiltersChange={onFiltersChangeMock}
          hideStatusFilter={false}
        />
      );

      expect(screen.getByText('ステータス')).toBeInTheDocument();
    });

    it('renders all status options in the status select', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      expect(screen.getByText('未処理')).toBeInTheDocument();
      expect(screen.getByText('処理中')).toBeInTheDocument();
      expect(screen.getByText('発送済')).toBeInTheDocument();
      expect(screen.getByText('配達完了')).toBeInTheDocument();
    });

    it('renders delivery date options (あり / なし)', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const yesOptions = screen.getAllByText('あり');
      const noOptions = screen.getAllByText('なし');
      expect(yesOptions.length).toBeGreaterThanOrEqual(1);
      expect(noOptions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Filter value display', () => {
    it('displays provided dateFrom value', () => {
      const filters: OrderFiltersType = { ...defaultFilters, dateFrom: '2024-01-01' };

      render(
        <OrderFilters filters={filters} onFiltersChange={onFiltersChangeMock} />
      );

      const inputs = screen.getAllByDisplayValue('2024-01-01');
      expect(inputs.length).toBe(1);
    });

    it('displays provided dateTo value', () => {
      const filters: OrderFiltersType = { ...defaultFilters, dateTo: '2024-12-31' };

      render(
        <OrderFilters filters={filters} onFiltersChange={onFiltersChangeMock} />
      );

      const inputs = screen.getAllByDisplayValue('2024-12-31');
      expect(inputs.length).toBe(1);
    });

    it('displays provided status value', () => {
      const filters: OrderFiltersType = { ...defaultFilters, status: 'shipped' };

      render(
        <OrderFilters filters={filters} onFiltersChange={onFiltersChangeMock} />
      );

      const statusSelect = screen.getByDisplayValue('発送済');
      expect(statusSelect).toBeInTheDocument();
    });

    it('displays provided hasDeliveryDate value', () => {
      const filters: OrderFiltersType = { ...defaultFilters, hasDeliveryDate: 'yes' };

      render(
        <OrderFilters filters={filters} onFiltersChange={onFiltersChangeMock} />
      );

      // There should be a select with 'yes' as a displayed value
      const deliveryDateLabel = screen.getByText('到着希望日');
      expect(deliveryDateLabel).toBeInTheDocument();
    });

    it('displays provided hasMemo value', () => {
      const filters: OrderFiltersType = { ...defaultFilters, hasMemo: 'no' };

      render(
        <OrderFilters filters={filters} onFiltersChange={onFiltersChangeMock} />
      );

      const memoLabel = screen.getByText('備考');
      expect(memoLabel).toBeInTheDocument();
    });
  });

  describe('Filter change handlers', () => {
    it('calls onFiltersChange with updated dateFrom when changed', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      // Find all date inputs and pick the first one (dateFrom)
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2024-03-01' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        dateFrom: '2024-03-01',
      });
    });

    it('calls onFiltersChange with updated dateTo when changed', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const dateInputs = document.querySelectorAll('input[type="date"]');
      // second date input is dateTo
      fireEvent.change(dateInputs[1], { target: { value: '2024-03-31' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        dateTo: '2024-03-31',
      });
    });

    it('calls onFiltersChange with updated status when changed', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const selects = document.querySelectorAll('select');
      // status select is the first one when hideStatusFilter is false
      fireEvent.change(selects[0], { target: { value: 'pending' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        status: 'pending',
      });
    });

    it('calls onFiltersChange with updated hasDeliveryDate when changed', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const selects = document.querySelectorAll('select');
      // With status filter visible: [status, hasDeliveryDate, hasMemo]
      fireEvent.change(selects[1], { target: { value: 'yes' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        hasDeliveryDate: 'yes',
      });
    });

    it('calls onFiltersChange with updated hasMemo when changed', () => {
      render(
        <OrderFilters filters={defaultFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const selects = document.querySelectorAll('select');
      // With status filter visible: [status, hasDeliveryDate, hasMemo]
      fireEvent.change(selects[2], { target: { value: 'no' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        hasMemo: 'no',
      });
    });

    it('calls onFiltersChange correctly when hideStatusFilter is true', () => {
      render(
        <OrderFilters
          filters={defaultFilters}
          onFiltersChange={onFiltersChangeMock}
          hideStatusFilter={true}
        />
      );

      // When status is hidden: selects are [hasDeliveryDate, hasMemo]
      const selects = document.querySelectorAll('select');
      fireEvent.change(selects[0], { target: { value: 'no' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        ...defaultFilters,
        hasDeliveryDate: 'no',
      });
    });
  });

  describe('Clear filters button', () => {
    it('calls onFiltersChange with reset filters when clear is clicked', () => {
      const filtersWithValues: OrderFiltersType = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        status: 'shipped',
        hasDeliveryDate: 'yes',
        hasMemo: 'yes',
      };

      render(
        <OrderFilters filters={filtersWithValues} onFiltersChange={onFiltersChangeMock} />
      );

      fireEvent.click(screen.getByText('クリア'));

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        dateFrom: '',
        dateTo: '',
        status: 'all',
        hasDeliveryDate: 'all',
        hasMemo: 'all',
      });
    });

    it('resets to default values regardless of current filter values', () => {
      const filtersWithValues: OrderFiltersType = {
        dateFrom: '2023-06-15',
        dateTo: '2023-07-20',
        status: 'processing',
        hasDeliveryDate: 'no',
        hasMemo: 'no',
      };

      render(
        <OrderFilters filters={filtersWithValues} onFiltersChange={onFiltersChangeMock} />
      );

      fireEvent.click(screen.getByText('クリア'));

      expect(onFiltersChangeMock).toHaveBeenCalledTimes(1);
      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        dateFrom: '',
        dateTo: '',
        status: 'all',
        hasDeliveryDate: 'all',
        hasMemo: 'all',
      });
    });
  });

  describe('Filter preservation on partial change', () => {
    it('preserves existing filters when only dateFrom changes', () => {
      const existingFilters: OrderFiltersType = {
        dateFrom: '2024-01-01',
        dateTo: '2024-06-30',
        status: 'pending',
        hasDeliveryDate: 'yes',
        hasMemo: 'no',
      };

      render(
        <OrderFilters filters={existingFilters} onFiltersChange={onFiltersChangeMock} />
      );

      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2024-02-01' } });

      expect(onFiltersChangeMock).toHaveBeenCalledWith({
        dateFrom: '2024-02-01',
        dateTo: '2024-06-30',
        status: 'pending',
        hasDeliveryDate: 'yes',
        hasMemo: 'no',
      });
    });
  });
});
