/**
 * Request utilities for extracting client IP and other request metadata.
 * Compatible with Next.js 15+ where NextRequest.ip is deprecated.
 */

/**
 * Extract client IP address from request headers.
 * Priority: x-forwarded-for (Cloudflare proxy), x-real-ip, forwarded.
 */
export function getClientIp(request: Request): string {
  // Try x-forwarded-for first (common in reverse proxy setups)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Try x-real-ip (common in Nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Try forwarded header (RFC 7239)
  const forwarded = request.headers.get('forwarded');
  if (forwarded) {
    // forwarded format: for=<ip>; proto=<proto>
    const forMatch = forwarded.match(/for=([^;]+)/);
    if (forMatch && forMatch[1]) {
      return forMatch[1].trim();
    }
  }

  // Fallback: use the request URL host if available
  const host = request.headers.get('host');
  if (host) {
    // Extract IP from host if it contains one (e.g., "192.168.1.1:3000")
    const ipMatch = host.match(/^([^:]+)/);
    if (ipMatch && ipMatch[1]) {
      return ipMatch[1];
    }
  }

  // Final fallback
  return 'unknown';
}

/**
 * Extract user agent from request.
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
