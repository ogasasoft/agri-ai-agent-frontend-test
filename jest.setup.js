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

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.OPENAI_API_KEY = 'test-openai-key'

// Global test utilities
global.fetch = jest.fn()

// Mock authentication middleware
jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
  generateCSRFToken: jest.fn(() => 'test-csrf-token'),
  logAuditEvent: jest.fn(),
  User: class User {},
  Session: class Session {}
}))

jest.mock('@/lib/auth-enhanced', () => ({
  authenticateUserEnhanced: jest.fn((request) => {
    // Default to successful authentication for all test requests
    return Promise.resolve({
      success: true,
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      session: {
        token: 'test-session-token',
        csrf_token: 'test-csrf-token',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      }
    })
  }),
  createErrorResponse: jest.fn((message, status = 500) => ({
    success: false,
    message,
    error: message
  }))
}))

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