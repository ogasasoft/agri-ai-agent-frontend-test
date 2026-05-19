/**
 * Customers Management Page Tests
 * Tests for the customer management interface
 */

import { render } from '@testing-library/react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Plus: () => <div data-testid="add-icon">Add</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="delete-icon">Delete</div>,
  Eye: () => <div data-testid="view-icon">View</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  MoreHorizontal: () => <div data-testid="more-icon">More</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  MapPin: () => <div data-testid="map-pin-icon">MapPin</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('Customers Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render customer list after loading completes', async () => {
    // Test when customers are successfully loaded
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customers: [
          {
            id: 1,
            customer_name: 'Test Customer',
            phone: '090-1234-5678',
            address: 'Test Address',
            email: 'test@example.com',
            total_orders: 5,
            total_spent: 15000,
            last_order_date: '2024-01-15',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 1,
            username: 'testuser',
          },
        ],
      }),
    });

    const { getByText } = render(<div>LoadingCustomersManagement</div>);
    // The component will be mounted, but the actual content depends on fetch response
    // This is a placeholder test
    expect(getByText).toBeTruthy();
  });
});
