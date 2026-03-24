import '@testing-library/jest-dom'

// Polyfills for Node.js Web Crypto API which requires TextEncoder/TextDecoder
// Using vanilla JavaScript (no TypeScript) to avoid SWC processing
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    constructor() {}
    encode(input) {
      const encoder = new TextEncoder()
      return encoder.encode(input)
    }
    getEncoding() {
      return 'utf-8'
    }
  }
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    constructor(encoding) {
      this.encoding = encoding || 'utf-8'
    }
    decode(input) {
      const decoder = new TextDecoder(this.encoding)
      return decoder.decode(input)
    }
  }
}

// Mock Request class for Next.js 16 app router API routes
// Always override to ensure our custom class with cookies support is used
{
  class Headers {
    constructor(init) {
      this._headers = new Map()
      this._cache = new Map()

      if (init) {
        // Normalize init to an object
        let entries = {}

        if (typeof init === 'string') {
          entries = this._parseHeaderString(init)
        } else if (init && typeof init === 'object') {
          // Check if it's a Headers-like object
          if (init.entries && typeof init.entries === 'function') {
            // Iterable entries like [key, value] pairs
            for (const [key, value] of init.entries()) {
              this.set(key, value)
            }
          } else if (init instanceof Headers) {
            // Copy from another Headers object
            for (const [key, value] of init.entries()) {
              this.set(key, value)
            }
          } else if (init[Symbol.iterator]) {
            // Iterable object (e.g., [key, value] pairs)
            for (const [key, value] of init) {
              this.set(key, value)
            }
          } else {
            // Plain object
            Object.entries(init).forEach(([key, value]) => {
              this.set(key, value)
            })
          }
        }
      }
    }

    _parseHeaderString(headerString) {
      const entries = {}
      headerString.split('\n').forEach(line => {
        const [key, ...values] = line.split(':')
        if (key && values.length > 0) {
          entries[key.trim()] = values.join(':').trim()
        }
      })
      return entries
    }

    get(name) {
      const lowerName = name.toLowerCase()
      return this._headers.get(lowerName) || ''
    }

    set(name, value) {
      const lowerName = name.toLowerCase()
      this._headers.set(lowerName, value)
      this._cache.delete(lowerName)
    }

    has(name) {
      return this._headers.has(name.toLowerCase())
    }

    delete(name) {
      const lowerName = name.toLowerCase()
      this._headers.delete(lowerName)
      this._cache.delete(lowerName)
    }

    forEach(callback, thisArg) {
      for (const [key, value] of this._headers.entries()) {
        callback.call(thisArg, value, key, this)
      }
    }

    entries() {
      return this._headers.entries()
    }

    keys() {
      return this._headers.keys()
    }

    values() {
      return this._headers.values()
    }

    get [Symbol.toStringTag]() {
      return 'Headers'
    }

    // Make Headers iterable
    [Symbol.iterator]() {
      return this.entries()
    }
  }

  class CookieJar {
    constructor() {
      this._cookies = new Map()
    }

    // Return { name, value } to match Next.js RequestCookie interface
    get(name) {
      const val = this._cookies.get(name)
      if (val === undefined) return undefined
      return { name, value: val }
    }

    set(name, value) {
      this._cookies.set(name, value)
    }

    getAll() {
      return Object.fromEntries(this._cookies)
    }
  }

  class RequestClass extends EventTarget {
    constructor(input, init) {
      super()
      this._input = input
      this._init = init
      this._cookies = new CookieJar()
      this._headers = new Headers(init?.headers)
      this._bodyData = null

      // If cookies are provided as an object, add them to the headers
      if (init?.cookies) {
        const cookiePairs = Object.entries(init.cookies).map(([name, value]) => {
          return `${name}=${value}`
        }).join('; ')
        this._headers.set('cookie', cookiePairs)
      }

      // Store body data for parsing
      if (init?.body) {
        if (typeof init.body === 'string') {
          this._bodyData = init.body
        } else if (init.body instanceof FormData) {
          this._bodyData = init.body
        }
      }
    }

    get method() {
      return this._init?.method || 'GET'
    }

    get headers() {
      return this._headers
    }

    get url() {
      return this._input instanceof URL ? this._input.href : this._input.toString()
    }

    get [Symbol.toStringTag]() {
      return 'Request'
    }

    get cookies() {
      return this._cookies
    }

    clone() {
      return new RequestClass(this._input, this._init)
    }

    json() {
      if (this._bodyData) {
        try {
          return JSON.parse(this._bodyData)
        } catch (error) {
          throw new Error(`Failed to parse JSON body: ${error.message}`)
        }
      }
      return {}
    }

    formData() {
      if (this._bodyData && this._headers.has('Content-Type')) {
        const contentType = this._headers.get('Content-Type')
        if (contentType.includes('multipart/form-data')) {
          // Return empty form data for now (simplified)
          return new FormData()
        }
      }
      return new FormData()
    }

    text() {
      return Promise.resolve(this._bodyData || '')
    }
  }

  globalThis.Request = RequestClass
  globalThis.Headers = Headers
}

// Mock Response class for Next.js 16 app router API routes
// Always override to ensure our custom class is used
{
  class ResponseClass extends EventTarget {
    constructor(body, init) {
      super()
      this._body = body
      this._init = init
      // Use globalThis.Headers set by the Request block above
      const HeadersClass = globalThis.Headers || Map
      this._headers = new HeadersClass(init?.headers)
      this._cookies = new Map()
    }

    get status() {
      return this._init?.status || 200
    }

    get statusText() {
      return this._init?.statusText || 'OK'
    }

    get headers() {
      return this._headers
    }

    get cookies() {
      return this._cookies
    }

    get [Symbol.toStringTag]() {
      return 'Response'
    }

    clone() {
      return new ResponseClass(this._body, this._init)
    }

    json(data) {
      this._body = JSON.stringify(data)
      return this
    }
  }

  globalThis.Response = ResponseClass
}

// Mock Next.js router (pages router)
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

// Mock Next.js router (app router)
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

// Mock Next.js server modules for API routes
jest.mock('next/server', () => {
  const Headers = globalThis.Headers || class Headers {
    constructor(init) {
      this._headers = new Map()
    }
    get(name) { return this._headers.get(name.toLowerCase()) || '' }
    set(name, value) { this._headers.set(name.toLowerCase(), value) }
    has(name) { return this._headers.has(name.toLowerCase()) }
    [Symbol.iterator]() { return this._headers.entries() }
  }

  const mockNextResponse = {
    json: jest.fn(function(data, init) {
      const status = init?.status || 200
      const statusText = init?.statusText || 'OK'
      const headers = new Headers(init?.headers)

      // Create a proper response object with cookies support
      const response = {
        status: status,
        statusText: statusText,
        headers: headers,
        cookies: {
          get: function(name) {
            return this._cookies?.get(name) || undefined
          },
          set: function(name, value, options) {
            if (!this._cookies) this._cookies = new Map()
            this._cookies.set(name, { value, options })
            // Build Set-Cookie header value to match real Next.js behaviour
            let cookieStr = `${name}=${value}`
            if (options) {
              if (options.maxAge !== undefined) cookieStr += `; Max-Age=${options.maxAge}`
              if (options.path) cookieStr += `; Path=${options.path}`
              if (options.httpOnly) cookieStr += `; HttpOnly`
              if (options.secure) cookieStr += `; Secure`
            }
            const existing = headers.get('set-cookie')
            headers.set('set-cookie', existing ? `${existing}, ${cookieStr}` : cookieStr)
          }
        },
        json: jest.fn(function() {
          return Promise.resolve(data)
        })
      }

      return response
    }),
    // Static methods like redirect, notFound if needed
    redirect: jest.fn(function(url, status = 302) {
      return new Response(null, {
        status: status,
        headers: { Location: url }
      })
    }),
    notFound: jest.fn(function() {
      return new Response('Not Found', { status: 404 })
    })
  }

  return {
    NextResponse: mockNextResponse,
    NextRequest: globalThis.Request
  }
})

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Global test utilities
global.fetch = jest.fn()

beforeEach(function() {
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
