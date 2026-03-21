// Jest Setup File

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@testhost/testdb';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Set up testing libraries
import '@testing-library/jest-dom';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} alt={props.alt} />,
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props) => <a {...props}>{props.children}</a>,
}));

// Mock PDF.js
jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn(),
  version: '2.0.0',
}));

// Mock window.matchMedia (useful for responsive design tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('TestingLibraryElementError'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
