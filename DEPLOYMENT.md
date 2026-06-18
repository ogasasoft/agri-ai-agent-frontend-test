# Deployment Guide

This guide covers how to deploy the Agri AI Agent Frontend to production.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Vercel Deployment](#vercel-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The Agri AI Agent Frontend is built with Next.js 16 and can be deployed to:
- **Vercel** (Recommended) - Zero-config deployment for Next.js
- **Self-hosted** - Deploy to any Node.js hosting provider
- **Docker** - Containerized deployment option

## Prerequisites

Before deployment, ensure you have:

- Node.js 20 or higher
- npm or yarn
- Git
- API keys for:
  - PostgreSQL database (Neon)
  - OpenAI API
  - Yamato Transport API (if using shipping features)
  - ColorMe Shop API (if using e-commerce sync)
  - Tabechoku API (if using food ordering sync)

## Vercel Deployment

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Initialize in project directory**:
   ```bash
   cd agri-ai-agent-frontend
   vercel
   ```

3. **Configure project**:
   - Follow prompts to configure project settings
   - Set project name
   - Choose production environment

4. **Add environment variables**:
   ```bash
   vercel env add DATABASE_URL
   vercel env add OPENAI_API_KEY
   vercel env add YAMATO_API_KEY
   vercel env add YAMATO_API_SECRET
   vercel env add COLORMI_API_KEY
   vercel env add TABECHOKU_API_KEY
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard

1. **Connect repository**: Import your GitHub repository in Vercel
2. **Configure environment variables**: Add all required variables in Vercel settings
3. **Deploy**: Vercel automatically deploys on push to main branch

### Environment Variables Configuration

#### Required Variables

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Yamato Transport (if using shipping features)
YAMATO_API_KEY=your-yamato-api-key
YAMATO_API_SECRET=your-yamato-api-secret
YAMATO_API_BASE_URL=https://api.yamato.co.jp/v1

# ColorMe Shop (if using e-commerce sync)
COLORMI_API_KEY=your-colormi-api-key

# Tabechoku (if using food ordering)
TABECHOKU_API_KEY=your-tabechoku-api-key
```

#### Optional Variables

```env
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Analytics (if using analytics tools)
NEXT_PUBLIC_GA_ID=your-ga-id
```

## Manual Deployment

### 1. Build the Application

```bash
npm run build
```

This creates an `.next` directory with optimized production build.

### 2. Start Production Server

```bash
npm start
```

The application will be available on `http://localhost:3000`

### 3. Test Production Build

```bash
# Test all functionality
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### 4. Deploy to Host

#### Option 1: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "agri-ai-agent" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

#### Option 2: Docker

```dockerfile
# Create Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t agri-ai-agent .

# Run container
docker run -p 3000:3000 -e DATABASE_URL=... agri-ai-agent
```

#### Option 3: systemd (Linux)

Create `/etc/systemd/system/agri-ai-agent.service`:

```ini
[Unit]
Description=Agri AI Agent Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/agri-ai-agent-frontend
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable agri-ai-agent
sudo systemctl start agri-ai-agent
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Application loads successfully
- [ ] All pages render correctly
- [ ] Authentication works
- [ ] API routes respond correctly
- [ ] Database connections work
- [ ] No console errors

### 2. Configure HTTPS

- [ ] Set up SSL certificate (Let's Encrypt recommended)
- [ ] Redirect HTTP to HTTPS
- [ ] Configure security headers

### 3. Set Up Monitoring

- [ ] Configure error tracking (Sentry, LogRocket, etc.)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation
- [ ] Set up alerts for critical issues

### 4. Security Checklist

- [ ] Environment variables are properly set
- [ ] Database credentials are secure
- [ ] API keys are not exposed in frontend code
- [ ] CSP headers are configured
- [ ] Input validation is enabled
- [ ] Rate limiting is in place
- [ ] Regular security audits are scheduled

## Monitoring

### Essential Monitoring Tools

1. **Error Tracking**: Sentry, LogRocket, or Rollbar
2. **Performance Monitoring**: Vercel Analytics, Google Analytics
3. **Uptime Monitoring**: UptimeRobot, Pingdom
4. **Log Management**: ELK Stack, Datadog, New Relic

### Key Metrics to Monitor

- **Uptime**: 99.9% target
- **Response Time**: < 2 seconds
- **Error Rate**: < 0.1%
- **API Latency**: < 500ms
- **Database Queries**: Optimize slow queries

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**: `Connection refused` or `SSL: required`

**Solution**:
```bash
# Verify DATABASE_URL format
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Test connection
psql $DATABASE_URL
```

#### 2. OpenAI API Errors

**Symptoms**: `Invalid API key` or `Rate limit exceeded`

**Solution**:
- Verify API key is correct
- Check API quota and billing
- Implement retry logic

#### 3. Build Errors

**Symptoms**: Build fails during deployment

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

#### 4. Environment Variables Not Loading

**Symptoms**: App uses default values instead of env vars

**Solution**:
- Verify env vars are set in Vercel dashboard
- Check for typos in variable names
- Restart application after changes

### Debug Mode

Enable debug logging:

```bash
# For Vercel
VERCEL_DEBUG=1 vercel --prod

# For local development
NODE_DEBUG=app,api yarn dev
```

## Rollback Procedure

If issues occur after deployment:

1. **Immediate Rollback**:
   ```bash
   # Vercel
   vercel rollback

   # Git
   git revert HEAD
   git push origin main
   ```

2. **Identify Issue**: Review logs and error tracking

3. **Fix Issue**: Update code and deploy again

4. **Monitor**: Watch closely for any issues

## Best Practices

1. **Incremental Deployment**: Deploy small changes frequently
2. **Feature Flags**: Test features before full rollout
3. **Blue-Green Deployment**: Zero-downtime deployments
4. **Canary Releases**: Gradually roll out to limited users
5. **Database Migrations**: Always test migrations before production
6. **Backup Strategy**: Regular database backups
7. **Documentation**: Keep deployment docs up to date

## Support

For deployment issues:
- Check Vercel logs
- Review GitHub issues
- Contact support team
- See project documentation

---

Last Updated: 2026-06-16
