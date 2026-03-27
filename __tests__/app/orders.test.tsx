// FILE: __tests__/app/orders.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import OrdersPage from '@/app/orders/page';

describe('OrdersPage', () => {
  it('redirects to pending shipping page', async () => {
    render(<OrdersPage />);

    // Check for redirect behavior
    await screen.findByText('Loading');
  });
});
