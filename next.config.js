/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove export mode for development with API routes
  // output: 'export',
  images: {
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs']
  },
  // Fix React hydration issues
  reactStrictMode: true,
  swcMinify: true,
  // セキュリティのため、環境変数をクライアントサイドに露出しない
  // env: {
  //   OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  // },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig