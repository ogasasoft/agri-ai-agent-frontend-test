import { NextRequest } from 'next/server';

/**
 * Extract client IP address from a NextRequest.
 * Checks x-forwarded-for (comma-separated, first entry) and x-real-ip headers.
 * Returns 'unknown' if no IP can be determined.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}
