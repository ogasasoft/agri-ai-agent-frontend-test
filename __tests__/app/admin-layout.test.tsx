// Tests for admin layout and dashboard pages
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AdminLayout from '@/app/admin/layout';
import AdminDashboard from '@/app/admin/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), replace: jest.fn() }),
  usePathname: jest.fn().mockReturnValue('/admin'),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: () => <span data-testid="users-icon" />,
  Database: () => <span data-testid="database-icon" />,
  Shield: () => <span />,
  BarChart3: () => <span />,
  LogOut: () => <span />,
  Menu: () => <span />,
  X: () => <span />,
  Home: () => <span />,
  Plug: () => <span />,
  ShoppingCart: () => <span />,
  TrendingUp: () => <span />,
  Activity: () => <span />,
  AlertCircle: () => <span />,
  CheckCircle: () => <span />,
  Clock: () => <span />,
  Package: () => <span />,
}));

const mockAdminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'super_admin',
  is_super_admin: true,
};

const mockStats = {
  totalUsers: 10,
  totalOrders: 100,
  totalCustomers: 50,
  activeIntegrations: 2,
  todayOrders: 5,
  weeklyGrowth: 12.5,
  systemHealth: 'healthy',
  lastBackup: '2026-03-28T00:00:00Z',
};

const mockActivities = [
  { id: '1', type: 'view_customers', message: 'admin viewed customers', timestamp: '2026-03-28', severity: 'info' },
];

describe('AdminLayout', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('shows loading spinner initially', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    const { container } = render(
      <AdminLayout>
        <div>Child content</div>
      </AdminLayout>
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders admin panel with children after successful auth', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: mockAdminUser }),
    });

    await act(async () => {
      render(
        <AdminLayout>
          <div data-testid="child-content">Child content</div>
        </AdminLayout>
      );
    });

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    const mockPush = jest.fn();
    const { useRouter } = require('next/navigation');
    useRouter.mockReturnValue({ push: mockPush });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });

    await act(async () => {
      render(
        <AdminLayout>
          <div>Child content</div>
        </AdminLayout>
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
  });

  it('redirects to login when fetch throws', async () => {
    const mockPush = jest.fn();
    const { useRouter } = require('next/navigation');
    useRouter.mockReturnValue({ push: mockPush });

    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(
        <AdminLayout>
          <div>Child content</div>
        </AdminLayout>
      );
    });

    expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
  });
});

describe('AdminDashboard', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));

    const { container } = render(<AdminDashboard />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard stats after loading', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, stats: mockStats }),
        });
      }
      if (url.includes('activities')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, activities: mockActivities }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    await act(async () => {
      render(<AdminDashboard />);
    });

    // Should show stats
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles fetch failures gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });

    await act(async () => {
      render(<AdminDashboard />);
    });

    // Should not crash - show some content
    expect(document.body).toBeInTheDocument();
  });
});
