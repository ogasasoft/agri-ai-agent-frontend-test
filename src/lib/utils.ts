import { NextRequest } from 'next/server';

/**
 * Extracts the client IP address from a NextRequest object
 * Respects proxy headers (x-forwarded-for) when running behind a reverse proxy
 *
 * @param request - The Next.js request object
 * @returns The client's IP address as a string
 */
export function getIPAddressFromRequest(request: NextRequest): string {
  // First, check the x-forwarded-for header (common for proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs; take the first one (the client)
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  // Fall back to the x-real-ip header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fall back to the direct connection IP
  const directIp = (request as any).ip;
  if (directIp) {
    return directIp;
  }

  // If no headers available, return unknown
  return 'unknown';
}

/**
 * Validates if a given string is a valid IPv4 or IPv6 address
 *
 * @param ip - The IP address to validate
 * @returns True if the IP address is valid
 */
export function isValidIPAddress(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  const localhostPattern = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const invalidSegmentsPattern = /:[^:]*:$/;

  // Check for localhost
  if (localhostPattern.test(ip)) {
    return true;
  }

  // Check for IPv4
  if (ipv4Pattern.test(ip)) {
    // Check each octet is between 0-255
    const octets = ip.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Check for IPv6
  if (ipv6Pattern.test(ip)) {
    // Validate segment count (should be 1-8 segments)
    const segments = ip.split(':').filter((s) => s.length > 0);
    if (segments.length < 2 || segments.length > 8) {
      return false;
    }

    // Validate no trailing colon
    if (invalidSegmentsPattern.test(ip)) {
      return false;
    }

    return true;
  }

  return false;
}
