/**
 * Extracts the client IP address from a Next.js request.
 * In Next.js 16+, the request.ip property was removed.
 * Uses the same logic as Next.js middleware for consistency.
 */
export function getClientIp(request: Request): string {
  // Try headers first (for serverless environments)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Fallback to connection info if available (for edge environments)
  // Note: request.ip is not available in Next.js 16+
  return 'unknown';
}
