import {
  addSecurityHeaders,
  createErrorResponse,
  createSuccessResponse,
  sanitizeInput,
  validateSqlInput,
  sanitizeForLogging,
} from '@/lib/security';

// next/server is mocked globally in jest.setup.js

describe('security.ts', () => {
  describe('sanitizeInput', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags < and >', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('<b>bold</b>')).toBe('bbold/b');
    });

    it('should truncate input to 1000 characters', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeInput(longString).length).toBe(1000);
    });

    it('should return normal strings unchanged', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
      expect(sanitizeInput('田中太郎')).toBe('田中太郎');
    });
  });

  describe('validateSqlInput', () => {
    it('should return false for SQL injection patterns', () => {
      expect(validateSqlInput("'; DROP TABLE users; --")).toBe(false);
      expect(validateSqlInput('SELECT * FROM users')).toBe(false);
      expect(validateSqlInput('INSERT INTO table')).toBe(false);
      expect(validateSqlInput('DELETE FROM orders')).toBe(false);
      expect(validateSqlInput('UNION SELECT password FROM users')).toBe(false);
      expect(validateSqlInput('--comment')).toBe(false);
      expect(validateSqlInput("test' OR '1'='1")).toBe(false);
    });

    it('should return true for safe input', () => {
      expect(validateSqlInput('John Doe')).toBe(true);
      expect(validateSqlInput('田中太郎')).toBe(true);
      expect(validateSqlInput('order123')).toBe(true);
      expect(validateSqlInput('testexample.com')).toBe(true);
    });

    it('should be case-insensitive for SQL keywords', () => {
      expect(validateSqlInput('select * from users')).toBe(false);
      expect(validateSqlInput('Select From')).toBe(false);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should return non-object values as-is', () => {
      expect(sanitizeForLogging('string')).toBe('string');
      expect(sanitizeForLogging(123)).toBe(123);
      expect(sanitizeForLogging(null)).toBe(null);
    });

    it('should redact sensitive keys', () => {
      const obj = {
        username: 'testuser',
        password: 'secret123',
        api_token: 'abc123',
        secret_key: 'mysecret',
        auth_header: 'Bearer token',
      };

      const sanitized = sanitizeForLogging(obj);
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.api_token).toBe('[REDACTED]');
      expect(sanitized.secret_key).toBe('[REDACTED]');
      expect(sanitized.auth_header).toBe('[REDACTED]');
    });

    it('should recursively sanitize nested objects', () => {
      const obj = {
        user: {
          name: 'test',
          password: 'secret',
        },
      };

      const sanitized = sanitizeForLogging(obj);
      expect(sanitized.user.name).toBe('test');
      expect(sanitized.user.password).toBe('[REDACTED]');
    });

    it('should not mutate the original object', () => {
      const obj = { password: 'secret', name: 'test' };
      sanitizeForLogging(obj);
      expect(obj.password).toBe('secret');
    });

    it('should handle empty objects', () => {
      expect(sanitizeForLogging({})).toEqual({});
    });
  });

  describe('addSecurityHeaders', () => {
    it('should add security headers to response', () => {
      const { NextResponse } = require('next/server');
      const response = NextResponse.json({ test: true });

      const result = addSecurityHeaders(response);

      expect(result.headers.get('X-Frame-Options')).toBe('DENY');
      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(result.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(result.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(result.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
      expect(result.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });

  describe('createErrorResponse', () => {
    it('should create a response with success: false', async () => {
      const response = createErrorResponse('Test error', 400);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Test error');
      expect(data.timestamp).toBeDefined();
    });

    it('should default to status 500', async () => {
      const response = createErrorResponse('Internal error');
      expect(response.status).toBe(500);
    });

    it('should include details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true, configurable: true });

      const response = createErrorResponse('Error', 500, { field: 'value' });
      const data = await response.json();

      expect(data.details).toEqual({ field: 'value' });

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true, configurable: true });
    });

    it('should not include details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true });

      const response = createErrorResponse('Error', 500, { field: 'value' });
      const data = await response.json();

      expect(data.details).toBeUndefined();

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true, configurable: true });
    });

    it('should add security headers', () => {
      const response = createErrorResponse('Error');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a response with success: true', async () => {
      const response = createSuccessResponse({ data: 'test' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBe('test');
      expect(data.timestamp).toBeDefined();
    });

    it('should support custom status code', async () => {
      const response = createSuccessResponse({ id: 1 }, 201);
      expect(response.status).toBe(201);
    });

    it('should add security headers', () => {
      const response = createSuccessResponse({});
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });
});
