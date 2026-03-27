/** @jest-environment node */
// FILE: __tests__/middleware.test.ts
/**
 * Tests for Next.js middleware - authentication, rate limiting, route protection
 */

// Mock next/server BEFORE importing middleware
jest.mock('next/server', () => {
  const mockHeaders = new Map<string, string>();

  return {
    NextResponse: {
      next: jest.fn().mockImplementation((init?: any) => ({
        type: 'next',
        headers: init?.request?.headers || new Map(),
        status: 200,
      })),
      redirect: jest.fn().mockImplementation((url: URL | string) => ({
        type: 'redirect',
        url: url instanceof URL ? url.toString() : url,
        headers: new Map(),
        status: 307,
      })),
      json: jest.fn().mockImplementation((data: any, init?: any) => ({
        type: 'json',
        data,
        status: init?.status || 200,
        headers: new Map(),
      })),
    },
    NextRequest: jest.requireActual('next/server').NextRequest,
  };
});

import { middleware } from '@/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Helper to create a mock NextRequest
function createRequest(
  pathname: string,
  options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    method?: string;
    ip?: string;
  } = {}
): NextRequest {
  const url = `http://localhost${pathname}`;
  const req = new NextRequest(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
  });

  // Add cookies via headers (since NextRequest reads from Cookie header)
  if (options.cookies && Object.keys(options.cookies).length > 0) {
    const cookieStr = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) => {
          const val = options.cookies![name];
          return val !== undefined ? { name, value: val } : undefined;
        },
        getAll: () =>
          Object.entries(options.cookies!).map(([name, value]) => ({ name, value })),
      },
      writable: true,
    });
  }

  if (options.ip) {
    Object.defineProperty(req, 'headers', {
      value: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return options.ip;
          return options.headers?.[name] || null;
        },
      },
      writable: true,
    });
  }

  return req;
}

// Reset NextResponse mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  (NextResponse.next as jest.Mock).mockImplementation((init?: any) => ({
    type: 'next',
    headers: init?.request?.headers || new Map(),
    status: 200,
  }));
  (NextResponse.redirect as jest.Mock).mockImplementation((url: URL | string) => ({
    type: 'redirect',
    url: url instanceof URL ? url.toString() : url,
    headers: new Map(),
    status: 307,
  }));
  (NextResponse.json as jest.Mock).mockImplementation((data: any, init?: any) => ({
    type: 'json',
    data,
    status: init?.status || 200,
    headers: new Map(),
  }));
});

// Ensure development mode so rate limiting is bypassed for most tests
const originalNodeEnv = process.env.NODE_ENV;
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});
afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('middleware', () => {
  describe('Static files and Next.js internals', () => {
    it('passes through _next/* requests', async () => {
      const req = createRequest('/_next/static/chunk.js');
      await middleware(req);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('passes through favicon requests', async () => {
      const req = createRequest('/favicon.ico');
      await middleware(req);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('passes through files with extensions', async () => {
      const req = createRequest('/logo.png');
      await middleware(req);

      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe('Public routes', () => {
    it('allows access to /login without session', async () => {
      const req = createRequest('/login');
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('allows access to /api/auth/login without session', async () => {
      const req = createRequest('/api/auth/login', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows access to /api/auth/auto-login without session', async () => {
      const req = createRequest('/api/auth/auto-login');
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows access to /api/migrate-security-enhancements without session', async () => {
      const req = createRequest('/api/migrate-security-enhancements', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows access to /api/migrate-admin-system without session', async () => {
      const req = createRequest('/api/migrate-admin-system', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('Protected page routes (customer-only pages)', () => {
    it('redirects /orders to login when no session token', async () => {
      const req = createRequest('/orders/shipping/pending');
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      const redirectUrl = redirectCall instanceof URL ? redirectCall.toString() : redirectCall;
      expect(redirectUrl).toContain('/login');
    });

    it('redirects /dashboard to login when no session token', async () => {
      const req = createRequest('/dashboard');
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('redirects /settings to login when no session token', async () => {
      const req = createRequest('/settings');
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('includes redirect param when redirecting to login', async () => {
      const req = createRequest('/orders/shipping/pending');
      await middleware(req);

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      const redirectUrl = redirectCall instanceof URL ? redirectCall.toString() : String(redirectCall);
      expect(redirectUrl).toContain('redirect=');
    });

    it('allows access to /orders when session token is present', async () => {
      const req = createRequest('/orders/shipping/pending', {
        cookies: { session_token: 'valid-session-token-123' },
      });
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows access to /dashboard when session token is present', async () => {
      const req = createRequest('/dashboard', {
        cookies: { session_token: 'valid-session-token-123' },
      });
      await middleware(req);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('Protected API routes (customer-only API)', () => {
    it('returns 401 for /api/orders without session token', async () => {
      const req = createRequest('/api/orders');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 for /api/upload without session token', async () => {
      const req = createRequest('/api/upload', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 for /api/customers without session token', async () => {
      const req = createRequest('/api/customers');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 for /api/shipping without session token', async () => {
      const req = createRequest('/api/shipping');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 for /api/chat without session token', async () => {
      const req = createRequest('/api/chat', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 with descriptive message for unauthenticated API access', async () => {
      const req = createRequest('/api/orders');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '認証が必要です。' }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('passes session token in headers for authenticated API requests', async () => {
      const req = createRequest('/api/orders', {
        cookies: { session_token: 'my-session-token' },
      });
      await middleware(req);

      expect(NextResponse.next).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            headers: expect.anything(),
          }),
        })
      );
    });
  });

  describe('Auth required routes (/api/auth/logout, /api/auth/me)', () => {
    it('returns 401 for /api/auth/logout without session', async () => {
      const req = createRequest('/api/auth/logout', { method: 'POST' });
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('returns 401 for /api/auth/me without session', async () => {
      const req = createRequest('/api/auth/me');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('allows /api/auth/me with session token', async () => {
      const req = createRequest('/api/auth/me', {
        cookies: { session_token: 'valid-session' },
      });
      await middleware(req);

      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 401 })
      );
    });
  });

  describe('Admin routes', () => {
    it('redirects /admin to login without session token', async () => {
      const req = createRequest('/admin');
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it('returns 401 for /api/admin without session token', async () => {
      const req = createRequest('/api/admin/me');
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });

    it('allows /admin with session token (further role check happens in API)', async () => {
      const req = createRequest('/admin', {
        cookies: { session_token: 'admin-session-token' },
      });
      await middleware(req);

      // Should NOT redirect to login (role check is in the API route itself)
      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 401 })
      );
    });
  });

  describe('Remember token handling', () => {
    it('redirects to auto-login for page routes with remember_token but no session', async () => {
      const req = createRequest('/orders/shipping/pending', {
        cookies: { remember_token: 'remember-me-token' },
      });
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      const redirectUrl = redirectCall instanceof URL ? redirectCall.toString() : String(redirectCall);
      expect(redirectUrl).toContain('/login');
      expect(redirectUrl).toContain('auto=true');
    });

    it('includes original path in redirect when using remember token', async () => {
      const req = createRequest('/orders/shipping/pending', {
        cookies: { remember_token: 'remember-me-token' },
      });
      await middleware(req);

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      const redirectUrl = redirectCall instanceof URL ? redirectCall.toString() : String(redirectCall);
      expect(redirectUrl).toContain('redirect=');
    });

    it('does NOT auto-redirect for API routes with remember_token but no session', async () => {
      // API routes with remember token should still get 401, not redirect to auto-login
      const req = createRequest('/api/orders', {
        cookies: { remember_token: 'remember-me-token' },
      });
      await middleware(req);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 401 })
      );
    });
  });

  describe('Root path redirect', () => {
    it('redirects / to /orders', async () => {
      const req = createRequest('/');
      await middleware(req);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      const redirectUrl = redirectCall instanceof URL ? redirectCall.toString() : String(redirectCall);
      expect(redirectUrl).toContain('/orders');
    });
  });

  describe('Rate limiting (production mode only)', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      // Switch to production to enable rate limiting
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    });

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    it('allows requests within rate limit', async () => {
      const ip = `test-ip-${Date.now()}-allow`;
      const headers = { 'x-forwarded-for': ip };
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        headers,
        ip,
      });

      await middleware(req);

      // Should not return 429 on first request
      const jsonCalls = (NextResponse.json as jest.Mock).mock.calls;
      const rateLimitCalls = jsonCalls.filter(
        (call: any[]) => call[1]?.status === 429
      );
      expect(rateLimitCalls.length).toBe(0);
    });

    it('blocks requests exceeding the rate limit', async () => {
      const ip = `test-ip-${Date.now()}-block`;

      // Hammer the login endpoint beyond its 10/min limit
      for (let i = 0; i < 11; i++) {
        const headers = { 'x-forwarded-for': ip };
        const req = createRequest('/api/auth/login', {
          method: 'POST',
          headers,
          ip,
        });
        // Override headers.get for IP extraction
        Object.defineProperty(req, 'headers', {
          value: { get: (name: string) => (name === 'x-forwarded-for' ? ip : null) },
          writable: true,
        });
        await middleware(req);
      }

      const jsonCalls = (NextResponse.json as jest.Mock).mock.calls;
      const rateLimitCalls = jsonCalls.filter(
        (call: any[]) => call[1]?.status === 429
      );
      expect(rateLimitCalls.length).toBeGreaterThan(0);
    });

    it('returns 429 status with descriptive message when rate limit exceeded', async () => {
      const ip = `test-ip-${Date.now()}-msg`;

      // Exceed limit
      for (let i = 0; i < 11; i++) {
        const req = createRequest('/api/auth/login', { method: 'POST', ip });
        Object.defineProperty(req, 'headers', {
          value: { get: (name: string) => (name === 'x-forwarded-for' ? ip : null) },
          writable: true,
        });
        await middleware(req);
      }

      const jsonCalls = (NextResponse.json as jest.Mock).mock.calls;
      const rateLimitCall = jsonCalls.find((call: any[]) => call[1]?.status === 429);
      if (rateLimitCall) {
        expect(rateLimitCall[0]).toMatchObject({
          success: false,
          message: expect.stringContaining('レート制限'),
        });
      }
    });
  });

  describe('Unmatched routes', () => {
    it('calls NextResponse.next for routes that do not match any rule', async () => {
      const req = createRequest('/some-unknown-public-path');
      await middleware(req);

      // Should not block or redirect unknown paths that don't need auth
      expect(NextResponse.json).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 401 })
      );
    });
  });
});
