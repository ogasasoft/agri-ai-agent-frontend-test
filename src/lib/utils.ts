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

  // Fall back to the direct connection IP
  const directIP = request.headers.get('x-real-ip');
  if (directIP) {
    return directIP;
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
  const ipv6Pattern = /^[0-9a-fA-F:]+:[0-9a-fA-F:.]+$/;

  if (ipv4Pattern.test(ip)) {
    // Check each octet is between 0-255
    const octets = ip.split('.');
    return octets.every((octet) => parseInt(octet, 10) >= 0 && parseInt(octet, 10) <= 255);
  }

  if (ipv6Pattern.test(ip)) {
    // Basic IPv6 validation
    return ip.split(':').every((part) => part.length <= 4);
  }

  return false;
}
