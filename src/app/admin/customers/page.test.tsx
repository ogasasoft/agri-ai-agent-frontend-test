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

  it('should display customer list initially with loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<div>LoadingCustomersManagement</div>);
    expect(document.body.textContent).toContain('読み込み中...');
  });
});
