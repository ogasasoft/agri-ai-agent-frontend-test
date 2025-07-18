/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove export mode for development with API routes
  // output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: []
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
}

module.exports = nextConfig