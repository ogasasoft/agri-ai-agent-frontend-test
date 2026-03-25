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
}));

import {
  validateAdminSession,
  logAdminAction,
  getClientInfo,
  isSuperAdmin,
  isAdmin,
  canManageUsers,
  canManageSettings,
  canManageAPI,
  AdminUser,
} from '@/lib/admin-auth';
import { createMockRequest } from '../setup/test-utils';

const { validateSession } = require('@/lib/auth');

beforeEach(() => {
  mockQuery.mockReset();
  mockEnd.mockReset();
  mockEnd.mockResolvedValue(undefined);
  mockQuery.mockResolvedValue({ rows: [] });
  validateSession.mockReset();
});

describe('admin-auth.ts', () => {
  describe('validateAdminSession', () => {
    it('should return null when session is invalid', async () => {
      validateSession.mockResolvedValue(null);

      const result = await validateAdminSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when user has no admin role', async () => {
      validateSession.mockResolvedValue({
        user: { id: 1, username: 'testuser', is_active: true },
        session: {},
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await validateAdminSession('user-token');

      expect(result).toBeNull();
    });

    it('should return admin user when user has admin role', async () => {
      validateSession.mockResolvedValue({
        user: { id: 2, username: 'adminuser', is_active: true },
        session: {},
      });

      const mockAdminUser = {
        id: 2,
        username: 'adminuser',
        email: 'admin@example.com',
        role: 'admin',
        is_super_admin: false,
        is_active: true,
        created_at: '2024-01-01',
      };

      mockQuery.mockResolvedValue({ rows: [mockAdminUser] });

      const result = await validateAdminSession('admin-token');

      expect(result).not.toBeNull();
      expect(result?.username).toBe('adminuser');
      expect(result?.role).toBe('admin');
    });

    it('should return super admin user', async () => {
      validateSession.mockResolvedValue({
        user: { id: 3, username: 'superadmin', is_active: true },
        session: {},
      });

      const mockSuperAdmin = {
        id: 3,
        username: 'superadmin',
        email: 'super@example.com',
        role: 'super_admin',
        is_super_admin: true,
        is_active: true,
        created_at: '2024-01-01',
      };

      mockQuery.mockResolvedValue({ rows: [mockSuperAdmin] });

      const result = await validateAdminSession('super-admin-token');

      expect(result).not.toBeNull();
      expect(result?.is_super_admin).toBe(true);
    });

    it('should return null on validation error', async () => {
      validateSession.mockRejectedValue(new Error('DB connection failed'));

      const result = await validateAdminSession('any-token');

      expect(result).toBeNull();
    });

    it('should query users table with admin role check', async () => {
      validateSession.mockResolvedValue({
        user: { id: 1 },
        session: {},
      });
      mockQuery.mockResolvedValue({ rows: [] });

      await validateAdminSession('token');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM users'),
        [1]
      );
    });
  });

  describe('logAdminAction', () => {
    it('should insert into admin_audit_logs', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logAdminAction(1, 'USER_CREATED', 'user', '42', { username: 'newuser' }, '127.0.0.1', 'Mozilla/5.0');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO admin_audit_logs'),
        expect.arrayContaining([1, 'USER_CREATED', 'user', '42'])
      );
    });

    it('should handle optional parameters with null defaults', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logAdminAction(1, 'ACTION_LOG');

      const [, params] = mockQuery.mock.calls[0];
      expect(params[2]).toBeNull();  // targetType
      expect(params[3]).toBeNull();  // targetId
      expect(params[5]).toBeNull();  // ipAddress
      expect(params[6]).toBeNull();  // userAgent
    });

    it('should serialize details as JSON', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const details = { action: 'test', value: 42 };

      await logAdminAction(1, 'ACTION', undefined, undefined, details);

      const [, params] = mockQuery.mock.calls[0];
      expect(params[4]).toBe(JSON.stringify(details));
    });

    it('should serialize empty details when not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logAdminAction(1, 'ACTION');

      const [, params] = mockQuery.mock.calls[0];
      expect(params[4]).toBe('{}');
    });

    it('should call client.end after operation', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await logAdminAction(1, 'TEST');

      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('getClientInfo', () => {
    it('should extract IP from x-forwarded-for', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('10.0.0.1');
    });

    it('should fall back to x-real-ip', () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '172.16.0.1' },
      });

      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('172.16.0.1');
    });

    it('should return "unknown" when no IP header', () => {
      const request = createMockRequest({});
      const { ipAddress } = getClientInfo(request);
      expect(ipAddress).toBe('unknown');
    });

    it('should extract user-agent', () => {
      const request = createMockRequest({
        headers: { 'user-agent': 'Test Browser 1.0' },
      });

      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('Test Browser 1.0');
    });

    it('should return "unknown" user agent when missing', () => {
      const request = createMockRequest({});
      const { userAgent } = getClientInfo(request);
      expect(userAgent).toBe('unknown');
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true when is_super_admin flag is true', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: true, is_active: true, created_at: '2024-01-01',
      };
      expect(isSuperAdmin(user)).toBe(true);
    });

    it('should return true when role is super_admin', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'super_admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(isSuperAdmin(user)).toBe(true);
    });

    it('should return false for regular admin', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(isSuperAdmin(user)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return true for super_admin role', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'super_admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return true when is_super_admin is true', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'user',
        is_super_admin: true, is_active: true, created_at: '2024-01-01',
      };
      expect(isAdmin(user)).toBe(true);
    });

    it('should return false for regular user', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'user',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(isAdmin(user)).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should allow super admin to manage users', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'super_admin',
        is_super_admin: true, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageUsers(user)).toBe(true);
    });

    it('should deny regular admin from managing users', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageUsers(user)).toBe(false);
    });
  });

  describe('canManageSettings', () => {
    it('should allow admin to manage settings', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageSettings(user)).toBe(true);
    });

    it('should deny regular user from managing settings', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'user',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageSettings(user)).toBe(false);
    });
  });

  describe('canManageAPI', () => {
    it('should allow super admin to manage API', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'super_admin',
        is_super_admin: true, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageAPI(user)).toBe(true);
    });

    it('should deny regular admin from managing API', () => {
      const user: AdminUser = {
        id: 1, username: 'user', role: 'admin',
        is_super_admin: false, is_active: true, created_at: '2024-01-01',
      };
      expect(canManageAPI(user)).toBe(false);
    });
  });
});
