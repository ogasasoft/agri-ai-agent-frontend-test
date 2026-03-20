/**
 * Tests for IP address extraction and validation utilities
 */

import { getIPAddressFromRequest, isValidIPAddress } from '@/lib/utils';

// Mock NextRequest class
class MockNextRequest {
  constructor(private headers: Map<string, string>) {}

  getHeader(name: string): string | null {
    return this.headers.get(name);
  }

  headers: Map<string, string>;
}

describe('getIPAddressFromRequest', () => {
  describe('Standard Request', () => {
    it('should extract IP from direct connection', () => {
      const request = new MockNextRequest(new Map());
      Object.defineProperty(request, 'ip', {
        get: () => '192.168.1.100',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('192.168.1.100');
    });

    it('should handle request with only user-agent header', () => {
      const request = new MockNextRequest(new Map([
        ['user-agent', 'Mozilla/5.0'],
      ]));
      Object.defineProperty(request, 'ip', {
        get: () => '10.0.0.1',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('10.0.0.1');
    });
  });

  describe('Proxy Headers', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '203.0.113.1, 203.0.113.2'],
        ['user-agent', 'Mozilla/5.0'],
      ]));
      Object.defineProperty(request, 'ip', {
        get: () => '10.0.0.1',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('203.0.113.1');
    });

    it('should handle multiple IPs in x-forwarded-for', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '192.168.1.100, 10.0.0.1, 172.16.0.1'],
        ['user-agent', 'Mozilla/5.0'],
      ]));
      Object.defineProperty(request, 'ip', {
        get: () => '10.0.0.1',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('192.168.1.100');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '203.0.113.5'],
        ['x-real-ip', '10.0.0.1'],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('203.0.113.5');
    });

    it('should handle empty x-forwarded-for', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', ''],
      ]));
      Object.defineProperty(request, 'ip', {
        get: () => '10.0.0.1',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('10.0.0.1');
    });

    it('should handle whitespace-only x-forwarded-for', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '   '],
      ]));
      Object.defineProperty(request, 'ip', {
        get: () => '10.0.0.1',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('10.0.0.1');
    });

    it('should strip leading/trailing whitespace from IPs', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '  203.0.113.1  ,  203.0.113.2  '],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('203.0.113.1');
    });
  });

  describe('Fallback Behavior', () => {
    it('should use x-real-ip when x-forwarded-for is not present', () => {
      const request = new MockNextRequest(new Map([
        ['x-real-ip', '10.0.0.2'],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('10.0.0.2');
    });

    it('should use direct IP when no proxy headers present', () => {
      const request = new MockNextRequest(new Map());
      Object.defineProperty(request, 'ip', {
        get: () => '172.16.0.50',
      });

      const ip = getIPAddressFromRequest(request as any);
      expect(ip).toBe('172.16.0.50');
    });

    it('should return "unknown" when all headers and IPs are missing', () => {
      const request = new MockNextRequest(new Map());

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle IPv6 addresses in x-forwarded-for', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '2001:db8::1, 192.168.1.1'],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('2001:db8::1');
    });

    it('should handle mixed IPv4 and IPv6', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '192.168.1.1, 2001:db8::1'],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should handle localhost addresses', () => {
      const request = new MockNextRequest(new Map([
        ['x-forwarded-for', '127.0.0.1'],
      ]));

      const ip = getIPAddressFromRequest(request);
      expect(ip).toBe('127.0.0.1');
    });
  });
});

describe('isValidIPAddress', () => {
  describe('IPv4 Addresses', () => {
    it('should validate valid IPv4 addresses', () => {
      expect(isValidIPAddress('192.168.1.1')).toBe(true);
      expect(isValidIPAddress('10.0.0.1')).toBe(true);
      expect(isValidIPAddress('172.16.0.1')).toBe(true);
      expect(isValidIPAddress('255.255.255.255')).toBe(true);
      expect(isValidIPAddress('0.0.0.0')).toBe(true);
    });

    it('should reject invalid IPv4 addresses with octets > 255', () => {
      expect(isValidIPAddress('192.168.1.256')).toBe(false);
      expect(isValidIPAddress('256.0.0.1')).toBe(false);
      expect(isValidIPAddress('1.2.3.4.5')).toBe(false);
    });

    it('should reject invalid IPv4 addresses with negative numbers', () => {
      expect(isValidIPAddress('-1.2.3.4')).toBe(false);
      expect(isValidIPAddress('1.-2.3.4')).toBe(false);
    });

    it('should reject invalid IPv4 addresses with non-numeric values', () => {
      expect(isValidIPAddress('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIPAddress('192.168.1.one')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidIPAddress('')).toBe(false);
      expect(isValidIPAddress('192.168..1')).toBe(false);
      expect(isValidIPAddress('192.168.1.')).toBe(false);
    });

    it('should reject single octets', () => {
      expect(isValidIPAddress('1')).toBe(false);
      expect(isValidIPAddress('192.168')).toBe(false);
    });
  });

  describe('IPv6 Addresses', () => {
    it('should validate valid IPv6 addresses', () => {
      expect(isValidIPAddress('2001:db8::1')).toBe(true);
      expect(isValidIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(isValidIPAddress('::1')).toBe(true);
      expect(isValidIPAddress('::')).toBe(true);
      expect(isValidIPAddress('2001:db8:0:0:0:0:2:1')).toBe(true);
    });

    it('should validate IPv6 addresses with shortened notation', () => {
      expect(isValidIPAddress('2001:db8::')).toBe(true);
      expect(isValidIPAddress('::ffff:192.0.2.1')).toBe(true);
      expect(isValidIPAddress('2001:db8::1::2')).toBe(false);
    });

    it('should reject invalid IPv6 addresses', () => {
      expect(isValidIPAddress('2001:db8:0:0:0:0:2')).toBe(false);
      expect(isValidIPAddress('2001:db8:0:0:0:0:2:1:2')).toBe(false);
      expect(isValidIPAddress('2001:db8:0:0:0:0:2:1.2.3.4')).toBe(false);
    });

    it('should reject IPv4 in invalid context', () => {
      expect(isValidIPAddress('192.168.1.1:8080')).toBe(false);
      expect(isValidIPAddress('[192.168.1.1]')).toBe(false);
    });
  });

  describe('Mixed Addresses', () => {
    it('should reject mixed IPv4 and IPv6 strings', () => {
      expect(isValidIPAddress('192.168.1.1, 2001:db8::1')).toBe(false);
    });

    it('should reject non-IP strings', () => {
      expect(isValidIPAddress('example.com')).toBe(false);
      expect(isValidIPAddress('localhost')).toBe(false);
      expect(isValidIPAddress('my-ip')).toBe(false);
      expect(isValidIPAddress('192.168.1.1.2')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidIPAddress(' 192.168.1.1 ')).toBe(false);
      expect(isValidIPAddress('192.168.1.1 ')).toBe(false);
      expect(isValidIPAddress(' 192.168.1.1')).toBe(false);
    });
  });
});
