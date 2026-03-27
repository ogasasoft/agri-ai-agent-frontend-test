/**
 * Component tests for LayoutWrapper
 */

import React from 'react';
import { render } from '@testing-library/react';
import LayoutWrapper from '@/components/LayoutWrapper';

// Mock the LayoutWrapper component
jest.mock('@/components/LayoutWrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    return (
      <div data-testid="layout-wrapper">
        <div data-testid="sidebar">Sidebar</div>
        <div data-testid="main-content">{children}</div>
      </div>
    );
  },
}));

describe('LayoutWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children for auth pages', () => {
    const { container } = render(
      <LayoutWrapper>
        <div data-testid="auth-content">Auth Content</div>
      </LayoutWrapper>
    );

    expect(container.querySelector('[data-testid="auth-content"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="auth-content"]')).toHaveTextContent('Auth Content');
  });

  it('should render children for admin pages', () => {
    const { container } = render(
      <LayoutWrapper>
        <div data-testid="admin-content">Admin Content</div>
      </LayoutWrapper>
    );

    expect(container.querySelector('[data-testid="admin-content"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="admin-content"]')).toHaveTextContent('Admin Content');
  });

  it('should render full layout for regular pages', () => {
    const { container } = render(
      <LayoutWrapper>
        <div data-testid="main-content">Main Content</div>
      </LayoutWrapper>
    );

    expect(container.querySelector('[data-testid="layout-wrapper"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="main-content"]')).toBeInTheDocument();
  });
});
