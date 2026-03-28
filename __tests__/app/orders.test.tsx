// FILE: __tests__/app/orders.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import OrdersPage from '@/app/orders/page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  redirect: jest.fn(),
}));

describe('OrdersPage', () => {
  it('redirects to pending shipping page', () => {
    const mockRedirect = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), redirect: mockRedirect });

    render(<OrdersPage />);

    // Check if redirect was called
    expect(mockRedirect).toHaveBeenCalledWith('/orders/shipping/pending');
  });
});
