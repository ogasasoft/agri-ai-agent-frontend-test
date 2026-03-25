// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
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

import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateCSRFToken,
  getClientInfo,
  logAuditEvent,
  authenticateUser,
  validateSession,
  invalidateSession,
  changePassword,
} from '@/lib/auth';
import { createMockRequest } from '../setup/test-utils';

const bcrypt = require('bcryptjs');

beforeEach(() => {
  mockQuery.mockReset();
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  bcrypt.hash.mockReset();
  bcrypt.compare.mockReset();
  bcrypt.hash.mockResolvedValue('hashed-password');
  bcrypt.compare.mockResolvedValue(true);
  // Default: audit_logs INSERT returns rows: []
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('auth.ts', () => {
  describe('hashPassword', () => {
    it('should return hash and salt', async () => {
      const result = await hashPassword('mypassword');

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
    });

    it('should generate different salt each time', async () => {
      const result1 = await hashPassword('password');
      const result2 = await hashPassword('password');

      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should use bcrypt with salt factor 12', async () => {
      await hashPassword('test');
      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for valid password', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const result = await verifyPassword('password', 'hash', 'salt');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const result = await verifyPassword('wrongpassword', 'hash', 'salt');
      expect(result).toBe(false);
    });

    it('should combine password and salt before comparing', async () => {
      await verifyPassword('mypass', 'hash', 'mysalt');
      expect(bcrypt.compare).toHaveBeenCalledWith('mypassmysalt', 'hash');
    });
  });

  describe('generateSessionToken', () => {
    it('should return a hex string', async () => {
      const token = await generateSessionToken();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate 128 character hex string (64 bytes)', async () => {
      const token = await generateSessionToken();
      expect(token.length).toBe(128);
    });

    it('should generate unique tokens', async () => {
      const token1 = await generateSessionToken();
      const token2 = await generateSessionToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateCSRFToken', () => {
    it('should return a hex string', async () => {
      const token = await generateCSRFToken();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate 64 character hex string (32 bytes)', async () => {
      const token = await generateCSRFToken();
      expect(token.length).toBe(64);
    });
  });

  describe('getClientInfo', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('192.168.1.1');
    });

    it('should fall back to x-real-ip header', () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '10.0.0.5' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('10.0.0.5');
    });

    it('should return "unknown" when no IP header present', () => {
      const request = createMockRequest({});

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('unknown');
    });

    it('should extract user agent', () => {
      const request = createMockRequest({
        headers: { 'user-agent': 'Mozilla/5.0 Test Browser' },
      });

      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should return "unknown" user agent when header missing', () => {
      const request = createMockRequest({});

      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('unknown');
    });
  });

  describe('logAuditEvent', () => {
    it('should insert into audit_logs', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logAuditEvent(1, 'LOGIN_SUCCESS', 'user', 1, { session: 'abc' }, '127.0.0.1', 'agent');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([1, 'LOGIN_SUCCESS', 'user', 1])
      );
    });

    it('should accept null userId', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        logAuditEvent(null, 'LOGIN_FAILED', 'user', undefined, { reason: 'not_found' })
      ).resolves.not.toThrow();
    });

    it('should call client.end after query', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await logAuditEvent(1, 'TEST', 'user');
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('authenticateUser', () => {
    it('should return failure when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await authenticateUser('unknown', 'password');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ユーザー名またはパスワードが間違っています');
    });

    it('should return failure for locked account', async () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          salt: 'salt',
          is_active: true,
          is_super_admin: false,
          failed_login_attempts: 5,
          locked_until: futureTime,
          password_changed_at: '2024-01-01',
          last_login_at: null,
          created_at: '2024-01-01',
        }],
      }).mockResolvedValue({ rows: [] });

      const result = await authenticateUser('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ロック');
    });

    it('should return failure for inactive account', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          salt: 'salt',
          is_active: false,
          is_super_admin: false,
          failed_login_attempts: 0,
          locked_until: null,
          password_changed_at: '2024-01-01',
          last_login_at: null,
          created_at: '2024-01-01',
        }],
      }).mockResolvedValue({ rows: [] });

      const result = await authenticateUser('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.message).toContain('無効');
    });

    it('should return failure for wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          salt: 'salt',
          is_active: true,
          is_super_admin: false,
          failed_login_attempts: 0,
          locked_until: null,
          password_changed_at: '2024-01-01',
          last_login_at: null,
          created_at: '2024-01-01',
        }],
      }).mockResolvedValue({ rows: [] });

      const result = await authenticateUser('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ユーザー名またはパスワードが間違っています');
    });

    it('should lock account after max failed attempts', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          salt: 'salt',
          is_active: true,
          is_super_admin: false,
          failed_login_attempts: 4, // one more = 5 = lock
          locked_until: null,
          password_changed_at: '2024-01-01',
          last_login_at: null,
          created_at: '2024-01-01',
        }],
      }).mockResolvedValue({ rows: [] });

      const result = await authenticateUser('testuser', 'wrong');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ロック');
    });

    it('should return success with session for valid credentials', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        salt: 'salt',
        is_active: true,
        is_super_admin: false,
        failed_login_attempts: 0,
        locked_until: null,
        password_changed_at: '2024-01-01',
        last_login_at: null,
        created_at: '2024-01-01',
      };

      const mockSession = {
        id: 1,
        user_id: 1,
        session_token: 'token123',
        csrf_token: 'csrf123',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'test',
        is_active: true,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // SELECT user
        .mockResolvedValueOnce({ rows: [] })          // UPDATE user (reset attempts)
        .mockResolvedValueOnce({ rows: [mockSession] }) // INSERT session
        .mockResolvedValue({ rows: [] });              // audit_logs

      const result = await authenticateUser('testuser', 'password', '127.0.0.1', 'test-agent');

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('testuser');
      expect(result.session).toBeDefined();
    });

    it('should detect admin default password requiring change', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const sameTime = '2024-01-01T00:00:00.000Z';
      const mockUser = {
        id: 1,
        username: 'admin',
        email: null,
        password_hash: 'hash',
        salt: 'salt',
        is_active: true,
        is_super_admin: false,
        failed_login_attempts: 0,
        locked_until: null,
        password_changed_at: sameTime,
        last_login_at: null,
        created_at: sameTime,
      };

      const mockSession = {
        id: 1, user_id: 1, session_token: 'tok', csrf_token: 'csrf',
        expires_at: new Date().toISOString(), is_active: true,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockSession] })
        .mockResolvedValue({ rows: [] });

      const result = await authenticateUser('admin', 'admin123');

      expect(result.success).toBe(true);
      expect(result.requiresPasswordChange).toBe(true);
    });
  });

  describe('validateSession', () => {
    it('should return null for invalid session token', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await validateSession('invalid-token');
      expect(result).toBeNull();
    });

    it('should return user and session for valid token', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          user_id: 1,
          username: 'testuser',
          email: 'test@example.com',
          is_active: true,
          is_super_admin: false,
          last_login_at: null,
          created_at: '2024-01-01',
          session_token: 'valid-token',
          csrf_token: 'csrf-token',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'test',
        }],
      });

      const result = await validateSession('valid-token');

      expect(result).not.toBeNull();
      expect(result?.user.username).toBe('testuser');
      expect(result?.session.session_token).toBe('valid-token');
    });
  });

  describe('invalidateSession', () => {
    it('should call UPDATE on sessions table', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await invalidateSession('session-token');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions'),
        ['session-token']
      );
    });

    it('should log audit event when userId provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await invalidateSession('session-token', 1);

      const calls = mockQuery.mock.calls;
      const auditCall = calls.find(call => call[0].includes('audit_logs'));
      expect(auditCall).toBeDefined();
    });

    it('should not log audit event when userId not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await invalidateSession('session-token');

      const calls = mockQuery.mock.calls;
      const auditCall = calls.find(call => call[0].includes('audit_logs'));
      expect(auditCall).toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('should reject short passwords', async () => {
      const result = await changePassword(1, 'old', 'short');

      expect(result.success).toBe(false);
      expect(result.message).toContain('8文字以上');
    });

    it('should return failure when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await changePassword(999, 'oldpassword', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('見つかりません');
    });

    it('should reject wrong current password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      mockQuery.mockResolvedValueOnce({
        rows: [{ password_hash: 'hash', salt: 'salt', username: 'testuser' }],
      }).mockResolvedValue({ rows: [] });

      const result = await changePassword(1, 'wrongpassword', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('現在のパスワードが間違っています');
    });

    it('should successfully change password', async () => {
      bcrypt.compare.mockResolvedValue(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{ password_hash: 'hash', salt: 'salt', username: 'testuser' }],
      }).mockResolvedValue({ rows: [] });

      const result = await changePassword(1, 'oldpassword', 'newpassword123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('変更しました');
    });

    it('should skip current password check when flag is set', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ password_hash: 'hash', salt: 'salt', username: 'testuser' }],
      }).mockResolvedValue({ rows: [] });

      const result = await changePassword(1, '', 'newpassword123', true);

      expect(result.success).toBe(true);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });
});
