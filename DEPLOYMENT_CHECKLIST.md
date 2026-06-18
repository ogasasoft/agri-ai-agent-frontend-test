# Deployment Checklist

Complete this checklist before deploying Agri AI Agent Frontend to production.

## Table of Contents

- [Pre-Deployment](#pre-deployment)
- [Environment Setup](#environment-setup)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Security Configuration](#security-configuration)
- [Testing](#testing)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment](#post-deployment)
- [Rollback Plan](#rollback-plan)

## Pre-Deployment

### Version Validation

- [ ] Version number updated in `package.json`
- [ ] `CHANGELOG.md` updated with new version release notes
- [ ] All critical bugs fixed
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Build successful (`npm run build`)

### Documentation

- [ ] README.md is up-to-date
- [ ] Security.md is reviewed
- [ ] Contributing.md is current (if applicable)
- [ ] Deployment guide reviewed

## Environment Setup

### Required Environment Variables

Create a `.env.production` file with the following:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# OpenAI API
OPENAI_API_KEY=sk-your-production-api-key

# Yamato Transport API (Production)
YAMATO_API_KEY=your-production-yamato-key
YAMATO_API_SECRET=your-production-yamato-secret
YAMATO_API_BASE_URL=https://api.yamato.co.jp/v1

# ColorMi Shop API (Production)
COLORMI_API_KEY=your-production-colormi-key
COLORMI_API_SECRET=your-production-colormi-secret
COLORMI_API_BASE_URL=https://api.colormi.com/v1

# Tabechoku API (Production)
TABECHOKU_API_KEY=your-production-tabechoku-key
TABECHOKU_API_SECRET=your-production-tabechoku-secret
TABECHOKU_API_BASE_URL=https://api.tabechoku.com/v1

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Required Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection string (SSL enabled)
- [ ] `OPENAI_API_KEY` - Production OpenAI API key
- [ ] `YAMATO_API_KEY` - Production Yamato Transport API key
- [ ] `YAMATO_API_SECRET` - Production Yamato Transport API secret
- [ ] `COLORMI_API_KEY` - Production ColorMi Shop API key
- [ ] `TABECHOKU_API_KEY` - Production Tabechoku API key
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL` - Production application URL

## Configuration

### Next.js Configuration

Check `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,

  // Environment variables are available in client and server
  env: {
    // You can add additional build-time env vars here
  },
};
```

**Configuration Checklist**:
- [ ] `reactStrictMode: true` - Use React strict mode
- [ ] `swcMinify: true` - Enabled for production builds
- [ ] `poweredByHeader: false` - Removed custom header
- [ ] `compress: true` - Enable gzip compression
- [ ] All security headers properly configured

### TypeScript Configuration

Check `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Configuration Checklist**:
- [ ] Strict mode enabled
- [ ] Path aliases configured (`@/*`)
- [ ] No `any` types in production code

## Database Setup

### PostgreSQL Requirements

- **Version**: PostgreSQL 14 or higher
- **Connection String Format**: `postgresql://user:password@host:port/database?sslmode=require`
- **SSL**: Required for production (Neon, AWS RDS, etc.)

### Database Schema Verification

Run migration scripts in order:

```bash
# 1. Authentication tables
curl http://localhost:3000/api/migrate-auth

# 2. Security enhancements tables
curl http://localhost:3000/api/migrate-security-enhancements

# 3. Admin system tables
curl http://localhost:3000/api/migrate-admin-system
```

**Migration Checklist**:
- [ ] All migration scripts completed successfully
- [ ] No migration errors or warnings
- [ ] Database indexes created
- [ ] Row Level Security (RLS) enabled
- [ ] User roles and permissions verified

### Backup Strategy

- [ ] Create database backup before deployment
- [ ] Test backup and restore procedure
- [ ] Set up automated daily backups
- [ ] Keep backups for 30+ days

## Security Configuration

### Security Headers

Ensure `next.config.js` includes security headers:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

**Security Checklist**:
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-XSS-Protection enabled
- [ ] HSTS enabled (max-age=31536000)
- [ ] Referrer-Policy set to strict-origin-when-cross-origin
- [ ] CSP configured appropriately

### Authentication & Authorization

- [ ] Remember Me tokens rotation enabled
- [ ] CSRF tokens enabled for all API routes
- [ ] Rate limiting configured
- [ ] Password hashing uses bcrypt with salt
- [ ] Session tokens have proper expiration (2 hours)
- [ ] Admin roles properly configured

### Environment Variables Security

- [ ] All sensitive data in environment variables (not in .env.local)
- [ ] `.env.production` added to `.gitignore`
- [ ] No secrets committed to repository
- [ ] Environment variables properly validated
- [ ] CI/CD secrets securely stored (GitHub Secrets, etc.)

## Testing

### Pre-Deployment Testing

Run all tests:

```bash
# 1. Run all tests
npm test

# 2. Check test coverage
npm run test:coverage

# 3. Type check
npm run typecheck

# 4. Lint
npm run lint

# 5. Build
npm run build
```

**Testing Checklist**:
- [ ] All tests passing (0 failures)
- [ ] Test coverage > 90%
- [ ] TypeScript compilation successful (0 errors)
- [ ] ESLint passes with no warnings (0 errors)
- [ ] Production build successful
- [ ] No console errors in build output

### Integration Testing

- [ ] Login flow tested
- [ ] Order management tested
- [ ] AI chat integration tested
- [ ] API routes tested
- [ ] Database queries tested
- [ ] Authentication flow tested
- [ ] Security features tested

## Deployment Steps

### Option 1: Vercel Deployment (Recommended)

#### Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import repository
4. Click "Import"

#### Step 2: Configure Project Settings

**General Settings**:
- [ ] Framework Preset: Next.js
- [ ] Root Directory: `./`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm ci`

**Environment Variables** (in Vercel Dashboard):
- [ ] `DATABASE_URL`
- [ ] `OPENAI_API_KEY`
- [ ] `YAMATO_API_KEY`
- [ ] `YAMATO_API_SECRET`
- [ ] `COLORMI_API_KEY`
- [ ] `COLORMI_API_SECRET`
- [ ] `TABECHOKU_API_KEY`
- [ ] `TABECHOKU_API_SECRET`
- [ ] `NODE_ENV`
- [ ] `NEXT_PUBLIC_APP_URL`

**Build & Development Settings**:
- [ ] Build Timeout: 10 minutes (default)
- [ ] Enable auto-optimization: ✅
- [ ] Enable Edge functions: ✅

#### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Verify deployment successful
4. Check environment URLs

#### Step 4: Post-Deployment Verification

- [ ] Homepage loads correctly
- [ ] Login page loads correctly
- [ ] Database connection established
- [ ] OpenAI API integration working
- [ ] Yamato Transport API integration working
- [ ] Security headers present
- [ ] Performance monitoring enabled

### Option 2: Docker Deployment

#### Step 1: Build Docker Image

```bash
# Build production image
npm run docker:build

# Tag image
docker tag agri-ai-frontend:latest your-registry.com/agri-ai-frontend:latest
```

#### Step 2: Push to Registry

```bash
# Push to Docker Hub (or your registry)
docker push your-registry.com/agri-ai-frontend:latest
```

#### Step 3: Deploy to Server

```bash
# Pull and run container
docker pull your-registry.com/agri-ai-frontend:latest

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=... \
  --name agri-ai-frontend \
  your-registry.com/agri-ai-frontend:latest
```

#### Step 4: Configure Nginx (Optional)

Create `/etc/nginx/sites-available/agri-ai-agent`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Deployment Checklist**:
- [ ] Nginx configured and running
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Firewall rules configured
- [ ] HTTPS enabled

## Post-Deployment

### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database connection
curl https://your-domain.com/api/database/health

# Check OpenAI API
curl https://your-domain.com/api/ai/health
```

**Health Check Checklist**:
- [ ] `/api/health` returns 200 OK
- [ ] Database connection established
- [ ] OpenAI API integration working
- [ ] All external API integrations working

### Monitoring Setup

- [ ] Enable Vercel Analytics (if using Vercel)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, etc.)
- [ ] Set up database performance monitoring
- [ ] Enable application logs

### Security Verification

- [ ] Security headers verified (using securityheaders.com)
- [ ] No security vulnerabilities (npm audit)
- [ ] CSRF tokens verified
- [ ] Rate limiting verified
- [ ] Session security verified

### Performance Monitoring

- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Database query time < 100ms
- [ ] Web Vitals score > 90
- [ ] Lighthouse performance score > 90

## Rollback Plan

### Vercel Rollback

1. Go to Vercel Dashboard
2. Go to "Deployments" tab
3. Click on the deployment you want to rollback to
4. Click "Rollback" button

### Docker Rollback

```bash
# Stop current container
docker stop agri-ai-frontend

# Remove current container
docker rm agri-ai-frontend

# Pull previous version
docker pull your-registry.com/agri-ai-frontend:v1.0.0

# Run previous version
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... \
  -e OPENAI_API_KEY=... \
  --name agri-ai-frontend \
  your-registry.com/agri-ai-frontend:v1.0.0
```

### Rollback Checklist

- [ ] Rollback procedure documented
- [ ] Rollback tested in staging environment
- [ ] Communication plan prepared
- [ ] Team notified of rollback
- [ ] Root cause analysis performed

## Emergency Contacts

- **Developer**: Amadeus (silentogasasoft@gmail.com)
- **DevOps**: [Name] - [Email]
- **Database Admin**: [Name] - [Email]
- **Security**: [Name] - [Email]

---

**Last Updated**: 2026-06-18
**Maintained By**: Development Team
**Next Review Date**: 2026-07-18
