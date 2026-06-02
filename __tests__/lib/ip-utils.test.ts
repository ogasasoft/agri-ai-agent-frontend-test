import { NextRequest } from 'next/server';
import { getClientIpAddress, getClientInfoFromRequest } from '@/lib/ip-utils';

/**
 * Helper to create a mock NextRequest with custom headers
 */
function createMockRequest(headers: Record<string, string | null> = {}): NextRequest {
  const req = {
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
  } as unknown as NextRequest;
  return req;
}

describe('IP Utils - getClientIpAddress', () => {
  it('extracts first IP from x-forwarded-for header', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
    });
    expect(getClientIpAddress(req)).toBe('192.168.1.1');
  });

  it('trims whitespace from x-forwarded-for IP', () => {
    const req = createMockRequest({
      'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
    });
    expect(getClientIpAddress(req)).toBe('192.168.1.1');
  });

  it('handles single IP in x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '203.0.113.5',
    });
    expect(getClientIpAddress(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is empty', () => {
    const req = createMockRequest({
      'x-forwarded-for': '',
      'x-real-ip': '198.51.100.10',
    });
    // Empty string is falsy, so it should fall through
    expect(getClientIpAddress(req)).toBe('198.51.100.10');
  });

  it('falls back to x-real-ip when x-forwarded-for is null', () => {
    const req = createMockRequest({
      'x-forwarded-for': null,
      'x-real-ip': '198.51.100.10',
    });
    expect(getClientIpAddress(req)).toBe('198.51.100.10');
  });

  it('trims whitespace from x-real-ip', () => {
    const req = createMockRequest({
      'x-real-ip': '  198.51.100.10  ',
    });
    expect(getClientIpAddress(req)).toBe('198.51.100.10');
  });

  it('returns unknown when no headers are present', () => {
    const req = createMockRequest({});
    expect(getClientIpAddress(req)).toBe('unknown');
  });

  it('returns unknown when all headers are null', () => {
    const req = createMockRequest({
      'x-forwarded-for': null,
      'x-real-ip': null,
    });
    expect(getClientIpAddress(req)).toBe('unknown');
  });

  it('handles x-forwarded-for with only commas', () => {
    const req = createMockRequest({
      'x-forwarded-for': ',,,',
      'x-real-ip': '198.51.100.10',
    });
    // split(',')[0] would be empty string, which is falsy after trim
    // Should fall through to x-real-ip
    expect(getClientIpAddress(req)).toBe('198.51.100.10');
  });

  it('handles IPv6 addresses in x-forwarded-for', () => {
    const req = createMockRequest({
      'x-forwarded-for': '2001:db8::1, 2001:db8::2',
    });
    expect(getClientIpAddress(req)).toBe('2001:db8::1');
  });

  it('handles IPv6 in x-real-ip', () => {
    const req = createMockRequest({
      'x-real-ip': '2001:db8::3',
    });
    expect(getClientIpAddress(req)).toBe('2001:db8::3');
  });
});

describe('IP Utils - getClientInfoFromRequest', () => {
  it('returns both ipAddress and userAgent', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.100',
      'user-agent': 'Mozilla/5.0 (Test Browser)',
    });
    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe('192.168.1.100');
    expect(info.userAgent).toBe('Mozilla/5.0 (Test Browser)');
  });

  it('returns unknown for both when no headers present', () => {
    const req = createMockRequest({});
    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe('unknown');
    expect(info.userAgent).toBe('unknown');
  });

  it('handles missing user-agent', () => {
    const req = createMockRequest({
      'x-forwarded-for': '10.0.0.1',
    });
    const info = getClientInfoFromRequest(req);
    expect(info.ipAddress).toBe('10.0.0.1');
    expect(info.userAgent).toBe('unknown');
  });
});
