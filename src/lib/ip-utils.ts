import { NextRequest } from 'next/server';

/**
 * Extracts the client IP address from a NextRequest.
 *
 * SECURITY NOTE: X-Forwarded-For and X-Real-IP headers can be spoofed by clients.
 * In production, ensure your application runs behind a trusted reverse proxy
 * (e.g., Nginx, Cloudflare, AWS ALB) that overwrites these headers.
 *
 * Trusted proxy configuration example (Nginx):
 *   proxy_set_header X-Forwarded-For $remote_addr;
 *   proxy_set_header X-Real-IP $remote_addr;
 *
 * Fallback chain (in priority order):
 *   1. x-forwarded-for (first IP, trimmed) — set by trusted proxy
 *   2. x-real-ip — set by trusted proxy
 *   3. 'unknown' — fallback when no headers are available
 *
 * @param request - The NextRequest object
 * @returns The extracted IP address string
 */
export function getClientIpAddress(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for format: "client, proxy1, proxy2"
    // Take the first (leftmost) IP which is the original client
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

/**
 * Extracts client information (IP address and User-Agent) from a NextRequest.
 *
 * @param request - The NextRequest object
 * @returns Object containing ipAddress and userAgent strings
 */
export function getClientInfoFromRequest(request: NextRequest): { ipAddress: string; userAgent: string } {
  const ipAddress = getClientIpAddress(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
