import { NextRequest } from 'next/server';

/**
 * Extract client IP address from NextRequest headers.
 * In Next.js 16+, request.ip was removed from NextRequest.
 * This helper provides a consistent way to get the client IP.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
