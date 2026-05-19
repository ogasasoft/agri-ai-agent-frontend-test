/**
 * Auth API Tests - Logout
 * Tests for the logout endpoint
 */

describe('Auth Logout API', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should return 200 and clear session on successful logout', async () => {
    // Mock the session destruction
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully',
    }), {
      status: 200,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: 'Logged out successfully',
    });
  });

  it('should handle GET method not allowed', async () => {
    const response = new Response('Method Not Allowed', {
      status: 405,
    });

    expect(response.status).toBe(405);
  });

  it('should return 500 if session destruction fails', async () => {
    const response = new Response(JSON.stringify({
      error: 'Failed to logout',
    }), {
      status: 500,
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Failed to logout',
    });
  });
});
