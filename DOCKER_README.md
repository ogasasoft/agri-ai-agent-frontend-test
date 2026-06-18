# Docker Deployment Guide

This project includes Docker support for Next.js 16 with PostgreSQL.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### Development Mode

```bash
# Create .env.local with your OpenAI API key
cp .env.example .env.local

# Build and start containers
docker-compose up --build

# Or use npm scripts (works in both Docker and local)
npm run docker:up
```

### Production Build

```bash
# Build Docker image
docker-compose build

# Start in production mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Clean Up

```bash
# Stop and remove containers, volumes, and networks
docker-compose down -v
```

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=postgresql://neondb_owner:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Docker Compose Settings

The `docker-compose.yml` file includes:

- Build context: `.` (current directory)
- Ports: `3000:3000`
- Environment variables: Database and API settings
- Volume mount: Source code for development
- Restart policy: `unless-stopped`

## How It Works

1. **Multi-stage Build**: Optimizes image size
   - `deps`: Install dependencies
   - `builder`: Build the application with Next.js
   - `runner`: Production-ready image

2. **Volume Mounting**: Development mode mounts source code for hot-reload

3. **Security**: Uses non-root user (`nextjs`)

4. **Database**: PostgreSQL connection via `DATABASE_URL`

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Or change the port in docker-compose.yml
```

### Build Failures

```bash
# Clean Docker cache and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database Connection Issues

```bash
# Ensure DATABASE_URL is correct
# Check network connectivity in Docker
docker-compose logs app
```

### Volume Permission Issues

```bash
# Ensure node_modules is owned correctly
sudo chown -R $USER:$USER .
```

## Production Deployment

For production deployment, consider:

1. Use `docker-compose build` for optimized image
2. Remove volume mounting in production
3. Use environment-specific values (not `.env.local`)
4. Use a reverse proxy (Nginx/Caddy)
5. Set up SSL/TLS with Let's Encrypt
6. Use a database backup strategy
7. Monitor logs with a logging solution

## Development Workflow

### Hot Reload

When running with volume mount, changes are reflected automatically:

```bash
docker-compose up
```

### Manual Restart

```bash
docker-compose restart app
```

### Database Migrations

```bash
docker-compose exec app npx prisma migrate deploy
```

### Accessing Container Shell

```bash
docker-compose exec app sh
```
