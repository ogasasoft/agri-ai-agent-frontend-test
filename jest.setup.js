import '@testing-library/jest-dom'

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
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js server utilities
jest.mock('next/server', () => {
  const mockResponse = () => {
    const headers = new Map()
    const body = []
    return {
      status: 200,
      headers: headers,
      json: jest.fn(async (data, init) => {
        const headersObj = new Map(headers)
        if (init?.headers) {
          Object.entries(init.headers).forEach(([key, value]) => {
            headersObj.set(key, value)
          })
        }
        return {
          status: init?.status || 200,
          headers: headersObj,
          json: async () => data,
          text: async () => JSON.stringify(data),
          ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
          redirected: false,
        }
      }),
      text: jest.fn(async () => {
        return headers.get('content-type')?.includes('json') ? '{}' : ''
      }),
      setHeader: jest.fn((key, value) => {
        headers.set(key, value)
      }),
      getHeader: jest.fn((key) => headers.get(key)),
      body,
    }
  }

  const mockNextRequest = jest.fn().mockImplementation((url, requestInit = {}) => {
    const headers = new Map()
    if (requestInit.headers) {
      Object.entries(requestInit.headers).forEach(([key, value]) => {
        headers.set(key, value)
      })
    }

    const cookies = new Map()
    const headersMap = new Map([...headers, ['cookie', Array.from(cookies.values()).join('; ')]])
    const cookiesSet = jest.fn((name, value) => {
      cookies.set(name, value)
    })
    const cookiesGet = jest.fn((name) => cookies.get(name))
    const cookiesDelete = jest.fn((name) => cookies.delete(name))

    return {
      url,
      method: requestInit.method || 'GET',
      headers: headersMap,
      body: requestInit.body || null,
      cookies: {
        get: cookiesGet,
        set: cookiesSet,
        delete: cookiesDelete,
      },
      json: jest.fn(async () => {
        if (requestInit.body) {
          return JSON.parse(requestInit.body)
        }
        return {}
      }),
      text: jest.fn(async () => {
        return requestInit.body ? String(requestInit.body) : ''
      }),
    }
  })

  return {
    NextResponse: mockResponse,
    NextRequest: mockNextRequest,
  }
})

// Mock Request class for Node.js environment
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init?.method || 'GET'
    this.credentials = init?.credentials || 'same-origin'
    this.headers = new Map()
    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key, value)
      })
    }
    this.body = init?.body || null
  }

  async json() {
    if (this.body) {
      return JSON.parse(this.body)
    }
    return {}
  }

  async text() {
    return this.body ? String(this.body) : ''
  }

  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body,
    })
  }
}

// Mock Response class
global.Response = class Response {
  constructor(body = '', init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(init.headers || [])
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }

  clone() {
    return new Response(this.body, { status: this.status, headers: this.headers })
  }
}

// Mock TextEncoder
global.TextEncoder = class TextEncoder {}
global.TextDecoder = class TextDecoder {}

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Global test utilities
global.fetch = jest.fn()

beforeEach(() => {
  fetch.mockClear()
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}