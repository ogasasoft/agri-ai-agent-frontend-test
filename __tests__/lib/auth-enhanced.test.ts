// Mocks must be defined before imports (jest hoisting)
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockQuery = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockClient = { query: mockQuery, end: mockEnd };

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => Promise.resolve(mockClient)),
}));

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}));

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
  generateSessionToken: jest.fn().mockResolvedValue('mock-session-token'),
  generateCSRFToken: jest.fn().mockResolvedValue('mock-csrf-token'),
}));

import {
  getClientInfo,
  checkRateLimit,
  logSecurityEvent,
  authenticateUserEnhanced,
  autoLoginWithRememberToken,
  validateSessionEnhanced,
  invalidateRememberTokensForUser,
  cleanupExpiredData,
} from '@/lib/auth-enhanced';
import { createMockRequest } from '../setup/test-utils';

const bcrypt = require('bcryptjs');
const { validateSession } = require('@/lib/auth');

beforeEach(() => {
  mockQuery.mockReset();
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  bcrypt.hash.mockReset();
  bcrypt.compare.mockReset();
  bcrypt.hash.mockResolvedValue('hashed-value');
  bcrypt.compare.mockResolvedValue(true);
  validateSession.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('auth-enhanced.ts', () => {
  describe('getClientInfo', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('192.168.1.1');
    });

    it('should fall back to x-real-ip', () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '10.0.0.5' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('10.0.0.5');
    });

    it('should return "unknown" when no IP header', () => {
      const request = createMockRequest({});
      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('unknown');
    });

    it('should extract user-agent', () => {
      const request = createMockRequest({
        headers: { 'user-agent': 'Jest Browser 1.0' },
      });

      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('Jest Browser 1.0');
    });

    it('should return "unknown" user-agent when missing', () => {
      const request = createMockRequest({});
      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('unknown');
    });
  });

  describe('checkRateLimit', () => {
    it('should return allowed when under the limit', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          attempt_count: 5,
          first_attempt_at: new Date(Date.now() - 60000),
          blocked_until: null,
        }],
      });

      const result = await checkRateLimit('127.0.0.1', 'login_attempt');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should return not allowed when blocked', async () => {
      const futureBlockUntil = new Date(Date.now() + 300000); // 5 min from now
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            attempt_count: 25,
            first_attempt_at: new Date(Date.now() - 60000),
            blocked_until: futureBlockUntil,
          }],
        })
        .mockResolvedValue({ rows: [] }); // UPDATE blocked_until

      const result = await checkRateLimit('192.168.1.100', 'login_attempt');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return not allowed when attempt count exceeds limit', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            attempt_count: 25, // > MAX_ATTEMPTS_PER_IP (20)
            first_attempt_at: new Date(Date.now() - 60000),
            blocked_until: null,
          }],
        })
        .mockResolvedValue({ rows: [] });

      const result = await checkRateLimit('192.168.1.100', 'login_attempt');

      expect(result.allowed).toBe(false);
    });

    it('should call client.end after operation', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          attempt_count: 1,
          first_attempt_at: new Date(),
          blocked_until: null,
        }],
      });

      await checkRateLimit('127.0.0.1', 'test');
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('should insert security event into database', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logSecurityEvent({
        event_type: 'login_failed',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        target_username: 'testuser',
        details: { reason: 'bad_password' },
        severity: 'medium',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining(['login_failed', '127.0.0.1', 'test-agent', 'testuser'])
      );
    });

    it('should handle events without optional fields', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(logSecurityEvent({
        event_type: 'suspicious_activity',
        severity: 'high',
      })).resolves.not.toThrow();
    });

    it('should serialize details as JSON', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const details = { attempts: 3 };

      await logSecurityEvent({
        event_type: 'rate_limit',
        severity: 'medium',
        details,
      });

      const [, params] = mockQuery.mock.calls[0];
      expect(params[4]).toBe(JSON.stringify(details));
    });
  });

  describe('authenticateUserEnhanced', () => {
    function makeRateLimitOkResult() {
      return {
        rows: [{
          attempt_count: 1,
          first_attempt_at: new Date(),
          blocked_until: null,
        }],
      };
    }

    it('should return failure when rate limit exceeded', async () => {
      const blockedUntil = new Date(Date.now() + 300000);
      mockQuery
        .mockResolvedValueOnce({ // checkRateLimit INSERT/UPDATE
          rows: [{
            attempt_count: 25,
            first_attempt_at: new Date(Date.now() - 60000),
            blocked_until: blockedUntil,
          }],
        })
        .mockResolvedValue({ rows: [] }); // All other queries

      const result = await authenticateUserEnhanced(
        'testuser', 'password', '192.168.1.1', 'agent'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('上限');
    });

    it('should return failure when user not found', async () => {
      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())  // rate limit
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] }) // password spray check
        .mockResolvedValueOnce({ rows: [] }) // SELECT user
        .mockResolvedValue({ rows: [] }); // audit/security events

      const result = await authenticateUserEnhanced(
        'nonexistent', 'password', '127.0.0.1', 'agent'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('ユーザー名またはパスワードが間違っています');
    });

    it('should detect password spray attack when many unique targets', async () => {
      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult()) // rate limit
        .mockResolvedValueOnce({ rows: [{ unique_targets: 10 }] }) // password spray
        .mockResolvedValueOnce({ rows: [] }) // SELECT user (not found)
        .mockResolvedValue({ rows: [] }); // security/audit events

      const result = await authenticateUserEnhanced(
        'target', 'password', '10.0.0.1', 'agent'
      );

      expect(result.success).toBe(false);
      // The spray detection should have logged and continued
    });

    it('should return failure for locked account', async () => {
      const futureTime = new Date(Date.now() + 60000);
      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1, username: 'testuser', email: null,
            password_hash: 'hash', salt: 'salt',
            is_active: true, is_super_admin: false,
            failed_login_attempts: 5,
            locked_until: futureTime,
            lockout_level: 1,
            consecutive_failures: 5,
            last_failed_ip: null,
            password_changed_at: '2024-01-01',
            last_login_at: null,
            created_at: '2024-01-01',
          }],
        })
        .mockResolvedValue({ rows: [] });

      const result = await authenticateUserEnhanced(
        'testuser', 'password', '127.0.0.1', 'agent'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('ロック');
      expect(result.lockoutInfo).toBeDefined();
    });

    it('should return failure for inactive account', async () => {
      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1, username: 'testuser', email: null,
            password_hash: 'hash', salt: 'salt',
            is_active: false, is_super_admin: false,
            failed_login_attempts: 0,
            locked_until: null, lockout_level: 0, consecutive_failures: 0,
            last_failed_ip: null, password_changed_at: '2024-01-01',
            last_login_at: null, created_at: '2024-01-01',
          }],
        })
        .mockResolvedValue({ rows: [] });

      const result = await authenticateUserEnhanced(
        'testuser', 'password', '127.0.0.1', 'agent'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('無効');
    });

    it('should return failure for wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1, username: 'testuser', email: null,
            password_hash: 'hash', salt: 'salt',
            is_active: true, is_super_admin: false,
            failed_login_attempts: 0,
            locked_until: null, lockout_level: 0, consecutive_failures: 0,
            last_failed_ip: null, password_changed_at: '2024-01-01',
            last_login_at: null, created_at: '2024-01-01',
          }],
        })
        .mockResolvedValue({ rows: [] }); // UPDATE users, security events, audit

      const result = await authenticateUserEnhanced(
        'testuser', 'wrongpassword', '127.0.0.1', 'agent'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('ユーザー名またはパスワードが間違っています');
    });

    it('should return success for valid credentials', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const mockSession = {
        id: 1, user_id: 1, session_token: 'sess-tok', csrf_token: 'csrf-tok',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
      };

      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1, username: 'testuser', email: 'test@example.com',
            password_hash: 'hash', salt: 'salt',
            is_active: true, is_super_admin: false,
            failed_login_attempts: 0,
            locked_until: null, lockout_level: 0, consecutive_failures: 0,
            last_failed_ip: null, password_changed_at: '2024-01-01',
            last_login_at: null, created_at: '2024-01-01',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users (reset failures)
        .mockResolvedValueOnce({ rows: [mockSession] }) // INSERT sessions
        .mockResolvedValue({ rows: [] }); // audit + security events

      const result = await authenticateUserEnhanced(
        'testuser', 'correct-password', '127.0.0.1', 'agent'
      );

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('testuser');
      expect(result.session).toBeDefined();
    });

    it('should create remember token when rememberMe is true', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const mockSession = {
        id: 1, user_id: 1, session_token: 'sess-tok', csrf_token: 'csrf-tok',
        expires_at: new Date().toISOString(), is_active: true,
      };

      mockQuery
        .mockResolvedValueOnce(makeRateLimitOkResult())
        .mockResolvedValueOnce({ rows: [{ unique_targets: 0 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1, username: 'testuser', email: null,
            password_hash: 'hash', salt: 'salt',
            is_active: true, is_super_admin: false,
            failed_login_attempts: 0,
            locked_until: null, lockout_level: 0, consecutive_failures: 0,
            last_failed_ip: null, password_changed_at: '2024-01-01',
            last_login_at: null, created_at: '2024-01-01',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users
        .mockResolvedValueOnce({ rows: [mockSession] }) // INSERT sessions
        .mockResolvedValue({ rows: [] }); // remember token INSERT + audit

      const result = await authenticateUserEnhanced(
        'testuser', 'correct', '127.0.0.1', 'agent', true
      );

      expect(result.success).toBe(true);
      expect(result.rememberToken).toBeDefined();
      expect(result.rememberToken?.selector).toBeTruthy();
      expect(result.rememberToken?.validator).toBeTruthy();
    });
  });

  describe('autoLoginWithRememberToken', () => {
    it('should return failure when token not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // SELECT remember_tokens
        .mockResolvedValue({ rows: [] }); // security event

      const result = await autoLoginWithRememberToken('bad-selector', 'validator', '127.0.0.1', 'agent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('無効');
    });

    it('should return failure when validator is invalid', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            user_id: 1, username: 'testuser', email: null,
            is_active: true, is_super_admin: false,
            token_hash: 'hash', selector: 'selector',
            last_login_at: null, created_at: '2024-01-01',
          }],
        })
        .mockResolvedValue({ rows: [] }); // DELETE + security event

      const result = await autoLoginWithRememberToken('selector', 'bad-validator', '127.0.0.1', 'agent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('セキュリティ');
    });
  });

  describe('validateSessionEnhanced', () => {
    it('should return null when session is invalid', async () => {
      validateSession.mockResolvedValue(null);

      const result = await validateSessionEnhanced('invalid-token');

      expect(result).toBeNull();
    });

    it('should return session data when valid', async () => {
      const mockSessionData = {
        user: { id: 1, username: 'testuser', is_active: true },
        session: {
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          session_token: 'valid-token',
        },
      };

      validateSession.mockResolvedValue(mockSessionData);
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await validateSessionEnhanced('valid-token', false);

      expect(result).not.toBeNull();
      expect(result?.user.username).toBe('testuser');
    });

    it('should auto-extend session when within 2 hours of expiry', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
      const mockSessionData = {
        user: { id: 1, username: 'testuser', is_active: true },
        session: {
          expires_at: soonExpiry.toISOString(),
          session_token: 'expiring-token',
        },
      };

      validateSession.mockResolvedValue(mockSessionData);
      mockQuery.mockResolvedValue({ rows: [] }); // UPDATE sessions

      const result = await validateSessionEnhanced('expiring-token', true);

      expect(result).not.toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions'),
        expect.arrayContaining(['expiring-token'])
      );
    });

    it('should not extend session when not within 2 hours of expiry', async () => {
      const farExpiry = new Date(Date.now() + 20 * 60 * 60 * 1000); // 20 hours from now
      const mockSessionData = {
        user: { id: 1, username: 'testuser', is_active: true },
        session: {
          expires_at: farExpiry.toISOString(),
          session_token: 'valid-token',
        },
      };

      validateSession.mockResolvedValue(mockSessionData);

      const result = await validateSessionEnhanced('valid-token', true);

      expect(result).not.toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('invalidateRememberTokensForUser', () => {
    it('should delete all remember tokens for user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await invalidateRememberTokensForUser(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM remember_tokens'),
        [42]
      );
    });
  });

  describe('cleanupExpiredData', () => {
    it('should call cleanup function', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await cleanupExpiredData();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('cleanup_expired_security_data')
      );
    });
  });
});
