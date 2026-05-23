import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js server utilities BEFORE importing route files
jest.mock('next/server', () => {
  const mockNextResponse = {
    json: jest.fn((data, init) => {
      const status = init?.status || 200;

      // Convert headers to a plain object if it's not one
      let headersObj = {};
      if (init?.headers) {
        if (typeof init.headers === 'object' && init.headers !== null) {
          headersObj = init.headers;
        } else if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
        }
      }
      // Ensure content-type is set
      if (!headersObj['content-type']) {
        headersObj['content-type'] = 'application/json';
      }

      // If Set-Cookie is an array, join them into a single string
      if (Array.isArray(headersObj['Set-Cookie'])) {
        headersObj['Set-Cookie'] = headersObj['Set-Cookie'].join(', ');
      }

      return {
        status: status,
        headers: headersObj,
        json: jest.fn(async () => data),
        text: jest.fn(async () => JSON.stringify(data)),
        ok: status >= 200 && status < 300,
        redirected: false,
      };
    }),
    redirect: jest.fn((url, init) => {
      const status = init?.status || 307; // Default for temporary redirect

      let headersObj = {};
      if (init?.headers) {
        if (typeof init.headers === 'object' && init.headers !== null) {
          headersObj = init.headers;
        } else if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
        }
      }
      headersObj['Location'] = url;

      return {
        status: status,
        headers: headersObj,
        json: jest.fn(async () => ({ message: `Redirected to ${url}` })),
        text: jest.fn(async () => `Redirecting to ${url}`),
        ok: status >= 300 && status < 400,
        redirected: true,
      };
    }),
    // Add other static methods if needed, e.g., NextResponse.next()
    next: jest.fn(() => ({
      status: 200,
      headers: {},
      json: jest.fn(async () => ({})),
      text: jest.fn(async () => ''),
      ok: true,
      redirected: false,
    })),
  };

  const mockNextRequest = jest.fn().mockImplementation((url, requestInit = {}) => {
    let headersObj = {};
    if (requestInit.headers) {
      if (requestInit.headers instanceof Headers) {
        requestInit.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } else if (typeof requestInit.headers === 'object' && requestInit.headers !== null) {
        headersObj = { ...requestInit.headers };
      }
    }

    // Auto-set Content-Type for POST requests with body
    if (requestInit.method === 'POST' && requestInit.body && !headersObj['Content-Type']) {
      headersObj['Content-Type'] = 'application/json';
    }

    // Build cookies map
    const cookies = new Map();
    if (requestInit.cookies && typeof requestInit.cookies === 'object') {
      Object.entries(requestInit.cookies).forEach(([name, value]) => {
        cookies.set(name, value);
      });
    }

    return {
      url,
      method: requestInit.method || 'GET',
      headers: headersObj,
      body: requestInit.body || null,
      cookies: {
        get: jest.fn((name) => cookies.get(name)),
        set: jest.fn((name, value) => {
          cookies.set(name, value);
        }),
        delete: jest.fn((name) => {
          cookies.delete(name);
        }),
      },
      json: jest.fn(async () => {
        if (requestInit.body) {
          return JSON.parse(requestInit.body);
        }
        return {};
      }),
      text: jest.fn(async () => {
        return requestInit.body ? String(requestInit.body) : '';
      }),
    };
  });

  return {
    NextResponse: mockNextResponse,
    NextRequest: mockNextRequest,
  };
});

// Mock Request class for Node.js environment
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.credentials = init?.credentials || 'same-origin';
    this.headers = new Map();
    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }
    this.body = init?.body || null;
  }

  async json() {
    if (this.body) {
      return JSON.parse(this.body);
    }
    return {};
  }

  async text() {
    return this.body ? String(this.body) : '';
  }

  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body,
    });
  }
};

// Mock Response class
global.Response = class Response {
  constructor(body = '', init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(init.headers || []);
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }

  clone() {
    return new Response(this.body, { status: this.status, headers: this.headers });
  }
};

// Mock TextEncoder
global.TextEncoder = class TextEncoder {};
global.TextDecoder = class TextDecoder {};

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Global test utilities
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
