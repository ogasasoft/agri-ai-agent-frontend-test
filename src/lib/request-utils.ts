/**
 * Utility functions for Next.js request handling
 */

import { NextRequest } from 'next/server';

/**
 * Extract IP address from request using header-based approach
 * @param request Next.js request object
 * @returns IP address string
 */
export function getIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs (client, proxy, etc.)
    // Return the first one (client IP)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to localhost for development
  return '127.0.0.1';
}
