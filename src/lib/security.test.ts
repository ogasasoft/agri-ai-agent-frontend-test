import {
  createErrorResponse,
  createSuccessResponse,
  sanitizeInput,
  validateSqlInput,
  sanitizeForLogging,
} from './security';

// Mock console for debugging
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  info: jest.spyOn(console, 'info').mockImplementation(),
  debug: jest.spyOn(console, 'debug').mockImplementation(),
};

describe('sanitizeInput', () => {
  it('should trim whitespace from input', () => {
    const result = sanitizeInput('  test  ');

    expect(result).toBe('test');
  });

  it('should remove angle brackets', () => {
    const result = sanitizeInput('<script>alert("test")</script>');

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('should truncate input to max length', () => {
    const longInput = 'a'.repeat(2000);
    const result = sanitizeInput(longInput);

    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('should return empty string for non-string input', () => {
    const result1 = sanitizeInput(null as any);
    const result2 = sanitizeInput(undefined as any);
    const result3 = sanitizeInput(123 as any);

    expect(result1).toBe('');
    expect(result2).toBe('');
    expect(result3).toBe('');
  });

  it('should not modify string without special characters', () => {
    const result = sanitizeInput('normal string');

    expect(result).toBe('normal string');
  });
});

describe('validateSqlInput', () => {
  it('should return true for safe input', () => {
    expect(validateSqlInput('normal input')).toBe(true);
    expect(validateSqlInput('user123')).toBe(true);
    expect(validateSqlInput('order-12345')).toBe(true);
  });

  it('should return false for SQL keywords', () => {
    expect(validateSqlInput('SELECT * FROM users')).toBe(false);
    expect(validateSqlInput('INSERT INTO orders')).toBe(false);
    expect(validateSqlInput('UPDATE users SET')).toBe(false);
    expect(validateSqlInput('DELETE FROM orders')).toBe(false);
  });

  it('should return false for SQL injection patterns', () => {
    expect(validateSqlInput("' OR '1'='1")).toBe(false);
    expect(validateSqlInput('; DROP TABLE users;')).toBe(false);
    expect(validateSqlInput('-- comment')).toBe(false);
    expect(validateSqlInput('/* comment */')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(validateSqlInput('select * from users')).toBe(false);
    expect(validateSqlInput('Insert INTO orders')).toBe(false);
    expect(validateSqlInput('UpDaTe users SeT')).toBe(false);
  });
});

describe('sanitizeForLogging', () => {
  it('should redact sensitive keys', () => {
    const obj = {
      username: 'testuser',
      password: 'secret123',
      apiKey: 'key123',
      token: 'token456',
    };

    const result = sanitizeForLogging(obj);

    expect(result.username).toBe('testuser');
    expect(result.password).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
  });

  it('should recursively sanitize nested objects', () => {
    const obj = {
      user: {
        name: 'John',
        password: 'secret',
      },
      sensitiveData: {
        key: 'value',
        token: 'secret',
      },
    };

    const result = sanitizeForLogging(obj);

    expect(result.user.password).toBe('[REDACTED]');
    expect(result.sensitiveData.token).toBe('[REDACTED]');
    expect(result.user.name).toBe('John');
    expect(result.sensitiveData.key).toBe('value');
  });

  it('should handle arrays', () => {
    const obj = {
      users: [
        { name: 'John', password: 'secret' },
        { name: 'Jane', password: 'secret' },
      ],
    };

    const result = sanitizeForLogging(obj);

    expect(result.users[0].password).toBe('[REDACTED]');
    expect(result.users[1].password).toBe('[REDACTED]');
  });

  it('should return unchanged non-object values', () => {
    const result1 = sanitizeForLogging('string');
    const result2 = sanitizeForLogging(123);
    const result3 = sanitizeForLogging(true);
    const result4 = sanitizeForLogging(null);

    expect(result1).toBe('string');
    expect(result2).toBe(123);
    expect(result3).toBe(true);
    expect(result4).toBe(null);
  });

  it('should not modify keys without sensitive keywords', () => {
    const obj = {
      user: 'testuser',
      order: '12345',
      customer: 'customer1',
    };

    const result = sanitizeForLogging(obj);

    expect(result.user).toBe('testuser');
    expect(result.order).toBe('12345');
    expect(result.customer).toBe('customer1');
  });
});
