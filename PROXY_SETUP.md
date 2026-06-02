# Trusted Proxy Configuration

## Overview

This application uses `x-forwarded-for` and `x-real-ip` headers to extract the client IP address. **These headers can be spoofed**, so it's critical to run behind a trusted reverse proxy in production.

## Security Warning

⚠️ **Never trust these headers without proper proxy configuration!**

A malicious client can set any IP address in these headers, bypassing rate limiting, audit logs, and security checks.

## Production Setup

### Nginx Configuration

Configure Nginx to set these headers from the client's actual IP:

```nginx
# /etc/nginx/sites-available/your-app

upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Allow requests from trusted IPs only (optional but recommended)
    # trust_proxy_cidr 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16;

    location / {
        proxy_pass http://backend;

        # Overwrite X-Forwarded-For with actual client IP
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;

        # Pass other important headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### AWS Application Load Balancer (ALB)

```json
{
  "LoadBalancerAttributes": [
    {
      "Key": "elb.xff-header-policy",
      "Value": "append-most-recent-forwarded-for"
    },
    {
      "Key": "elb.x-real-ip-header-policy",
      "Value": "append-x-real-ip"
    }
  ]
}
```

### Cloudflare

Cloudflare automatically sets `X-Forwarded-For` to the original client IP in most cases. However, for highest security, configure:

- **SSL/TLS**: Always enabled (Full Strict mode)
- **Bot Fight Mode**: Enabled
- **Under Attack Mode**: Enabled during high traffic

### Vercel/Next.js (Production)

Vercel automatically handles IP forwarding. No additional configuration needed.

## Code Implementation

The application uses `src/lib/ip-utils.ts` for IP extraction:

```typescript
import { getClientIpAddress, getClientInfoFromRequest } from '@/lib/ip-utils';

// Extract IP with fallback
const ipAddress = getClientIpAddress(request);

// Extract both IP and User-Agent
const clientInfo = getClientInfoFromRequest(request);

// Log audit event with correct IP
await logAuditEvent(
  userId,
  'LOGIN_SUCCESS',
  'user',
  userId,
  details,
  clientInfo.ipAddress,
  clientInfo.userAgent
);
```

## Audit Trail Integrity

IP addresses are used in:
- Rate limiting (prevent brute force attacks)
- Audit logs (track who performed actions)
- Security event logging (detect anomalies)

Ensure your proxy configuration preserves these values correctly to maintain audit trail integrity.

## Testing

Run the IP utility tests to verify proper behavior:

```bash
npm test -- ip-utils.test.ts
```

Test cases cover:
- Multiple IPs in `x-forwarded-for` (takes first)
- Whitespace handling
- Fallback chain (`x-forwarded-for` → `x-real-ip` → `unknown`)
- IPv4 and IPv6 support
- Null/undefined edge cases

## Development Environment

In development, if you're not behind a proxy:
- The code will fall back to `'unknown'` if no headers are present
- Rate limiting is disabled (`NODE_ENV=development`)
- This is intentional for easier local testing

## Troubleshooting

### Audit logs showing wrong IPs

1. Check proxy configuration (Nginx, ALB, etc.)
2. Verify `X-Forwarded-For` is set to `$remote_addr`
3. Check if you have multiple proxies (use `$binary_remote_addr` or correct forwarding chain)
4. Review the test suite to ensure headers are being passed correctly

### Rate limiting not working

1. Verify proxy is forwarding client IPs
2. Check that `x-forwarded-for` header contains client IP (not proxy IPs)
3. Ensure rate limiting is enabled (not in development mode)

### "unknown" IPs appearing in logs

1. Check if headers are being set by proxy
2. Verify proxy configuration uses `$remote_addr`
3. Test with `curl -H "X-Forwarded-For: 1.2.3.4" http://your-app`

## References

- [Nginx `proxy_set_header` documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)
- [OWASP: Forwarded HTTP Header](https://cheatsheetseries.owasp.org/cheatsheets/Forwarded_Header_Cheat_Sheet.html)
- [RFC 7239: Forwarded HTTP Header](https://tools.ietf.org/html/rfc7239)
