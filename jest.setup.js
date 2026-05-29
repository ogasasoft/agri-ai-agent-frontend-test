import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

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
  const mockHeaders = jest.fn(function() {
    this._headers = new Map();
  });

  mockHeaders.prototype.get = jest.fn(function(name) {
    let value = this._headers.get(name);
    // If value is an array, join them
    if (Array.isArray(value)) {
      value = value.join(', ');
    }
    return value || null;
  });

  mockHeaders.prototype.set = jest.fn(function(name, value) {
    this._headers.set(name, value);
  });

  mockHeaders.prototype.has = jest.fn(function(name) {
    return this._headers.has(name);
  });

  mockHeaders.prototype.append = jest.fn(function(name, value) {
    this._headers.set(name, value);
  });

  mockHeaders.prototype.delete = jest.fn(function(name) {
    this._headers.delete(name);
  });

  mockHeaders.prototype.forEach = jest.fn(function(callback, thisArg) {
    this._headers.forEach((value, key) => {
      callback.call(thisArg, value, key, this);
    });
  });

  const mockNextResponse = {
    json: jest.fn((data, init) => {
      const status = init?.status || 200;

      // Ensure headers is a Headers instance
      let headers = init?.headers;
      if (!headers || !(headers instanceof Headers)) {
        headers = new mockHeaders();
        if (!init?.headers) {
          headers.set('content-type', 'application/json');
        }
      }

      // If Set-Cookie is an array, join them into a single string
      const setCookie = headers.get('Set-Cookie');
      if (Array.isArray(setCookie)) {
        headers.set('Set-Cookie', setCookie.join(', '));
      }

      return {
        status: status,
        headers: headers,
        json: jest.fn(async () => data),
        text: jest.fn(async () => JSON.stringify(data)),
        ok: status >= 200 && status < 300,
        redirected: false,
      };
    }),
    redirect: jest.fn((url, init) => {
      const status = init?.status || 307; // Default for temporary redirect

      let headers = init?.headers;
      if (!headers || !(headers instanceof Headers)) {
        headers = new mockHeaders();
      }
      headers.set('Location', url);

      return {
        status: status,
        headers: headers,
        json: jest.fn(async () => ({ message: `Redirected to ${url}` })),
        text: jest.fn(async () => `Redirecting to ${url}`),
        ok: status >= 300 && status < 400,
        redirected: true,
      };
    }),
    // Add other static methods if needed, e.g., NextResponse.next()
    next: jest.fn(() => ({
      status: 200,
      headers: new mockHeaders(),
      json: jest.fn(async () => ({})),
      text: jest.fn(async () => ''),
      ok: true,
      redirected: false,
    })),
  };

  const mockNextRequest = jest.fn().mockImplementation((url, requestInit = {}) => {
    let headers = requestInit.headers;
    if (!headers || !(headers instanceof Headers)) {
      headers = new mockHeaders();
      if (requestInit.method === 'POST' && requestInit.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
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
      headers: headers,
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
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock DB client
jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(),
  withDatabase: jest.fn()
}));

// Mock Headers class
global.Headers = class Headers {
  constructor(init) {
    this._headers = new Map();
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this._headers.set(key, value));
      } else if (typeof init === 'object' && init !== null) {
        Object.entries(init).forEach(([key, value]) => this._headers.set(key, value));
      }
    }
  }
  get(name) {
    return this._headers.get(name) || null;
  }
  set(name, value) {
    this._headers.set(name, value);
  }
  has(name) {
    return this._headers.has(name);
  }
  append(name, value) {
    this._headers.set(name, value);
  }
  delete(name) {
    this._headers.delete(name);
  }
  forEach(callback, thisArg) {
    this._headers.forEach((value, key) => callback.call(thisArg, value, key, this));
  }
  entries() {
    return this._headers.entries();
  }
  values() {
    return this._headers.values();
  }
  keys() {
    return this._headers.keys();
  }
  [Symbol.iterator]() {
    return this._headers[Symbol.iterator]();
  }
};

// Global test utilities
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

// Temporarily disable mock console methods to see output during debugging
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
