// FILE: __tests__/app/orders.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import OrdersPage from '@/app/orders/page';
import { redirect } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  redirect: jest.fn(),
}));

describe('OrdersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to pending shipping page', () => {
    render(<OrdersPage />);
    expect(redirect).toHaveBeenCalledWith('/orders/shipping/pending');
  });
});
