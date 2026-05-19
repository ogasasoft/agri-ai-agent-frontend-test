/**
 * Homepage Tests
 * Tests for the main page redirection
 */

import { render } from '@testing-library/react';
import { redirect } from 'next/navigation';

// Mock redirect function
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to /orders page on mount', () => {
    render(<div />);
    expect(redirect).toHaveBeenCalledWith('/orders');
  });

  it('should redirect exactly to /orders, not related paths', () => {
    render(<div />);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/orders');
  });

  it('should have no content rendered (redirects immediately)', () => {
    const { container } = render(<div />);
    expect(container.firstChild).toBeNull();
  });
});
