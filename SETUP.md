# Local Development Setup Guide

This guide will help you set up the Agri AI Agent Frontend development environment locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20.0.0 or higher** (LTS version recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **PostgreSQL** database (local or cloud-based like Neon)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd agri-ai-agent-frontend-test
```

### 2. Install Dependencies

```bash
npm install
```

or

```bash
yarn install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Yamato Transport API (for future use)
YAMATO_API_KEY=your-yamato-api-key
YAMATO_API_SECRET=your-yamato-api-secret
YAMATO_API_BASE_URL=https://api.yamato.co.jp/v1

# Colormesh API (for future use)
COLORMI_API_KEY=your-colormi-api-key

# Tabechoku API (for future use)
TABECHOKU_API_KEY=your-tabechoku-api-key

# Application Settings
NODE_ENV=development
PORT=3000
```

#### Environment Variable Details

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI chat | - |
| `YAMATO_API_KEY` | No | Yamato Transport API key | - |
| `YAMATO_API_SECRET` | No | Yamato Transport API secret | - |
| `YAMATO_API_BASE_URL` | No | Yamato API base URL | `https://api.yamato.co.jp/v1` |
| `COLORMI_API_KEY` | No | Colormesh API key | - |
| `TABECHOKU_API_KEY` | No | Tabechoku API key | - |
| `NODE_ENV` | No | Application environment | `development` |
| `PORT` | No | Application port | `3000` |

### 4. Database Setup

#### Option A: Using Neon (Cloud PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the Neon dashboard
4. Set as `DATABASE_URL` in `.env.local`

#### Option B: Using Local PostgreSQL

1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. Create a database:
   ```bash
   createdb agri_ai_agent
   ```
3. Update `DATABASE_URL` in `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/agri_ai_agent
   ```

#### Run Database Migrations

After setting up the database, run the migrations:

```bash
npm run migrate
```

Or manually access the migration endpoints in your browser:

```
http://localhost:3000/api/migrate-auth
http://localhost:3000/api/migrate-security-enhancements
http://localhost:3000/api/migrate-admin-system
```

### 5. Create Admin User

After database setup, create an admin user:

```bash
npm run create-admin
```

Or access the admin setup endpoint:
```
http://localhost:3000/api/setup-admin
```

Default admin credentials:
- **Email**: `silentogasasoft@gmail.com`
- **Password**: `Ogasa1995`

**⚠️ IMPORTANT**: Change the default password immediately after first login!

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Development Workflow

### Running Development Server

```bash
# Standard development mode
npm run dev

# With verbose logging
npm run dev -- --verbose
```

### Code Quality Checks

```bash
# TypeScript type checking
npm run typecheck

# ESLint check
npm run lint

# Prettier check
npm run format:check

# All quality checks
npm run quality-check
```

### Fix Code Quality Issues

```bash
# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Format code with Prettier (fix)
npm run format-fix
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Building for Production

```bash
# Build application
npm run build

# Start production server
npm run start
```

## Useful Development Commands

### Code Quality

```bash
# Run all quality checks together
npm run quality-check

# Check TypeScript errors only
npm run typecheck

# Check ESLint errors only
npm run lint

# Check Prettier formatting only
npm run format:check
```

### Database Operations

```bash
# Run database migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database
npm run db:reset
```

### Testing

```bash
# Run specific test file
npm test -- --testPathPattern=filename.test.tsx

# Run specific test suite
npm test -- --testPathPattern=auth

# Run tests with debug output
npm test -- --inspect-brk

# View test coverage in browser
npm run test:coverage
```

## Troubleshooting

### Database Connection Issues

**Problem**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correctly set in `.env.local`
2. Check if PostgreSQL is running: `pg_isready`
3. Test connection: `psql $DATABASE_URL`
4. Check firewall settings

### OpenAI API Errors

**Problem**: `Invalid API key`

**Solutions**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has necessary permissions
3. Verify API quota is available

### Build Errors

**Problem**: Build fails with TypeScript errors

**Solutions**:
1. Run `npm run typecheck` to see detailed errors
2. Run `npm run lint:fix` to fix ESLint issues
3. Clear `.next` cache: `rm -rf .next && npm install`

### Module Not Found Errors

**Problem**: `Module not found: Can't resolve '...'`

**Solutions**:
1. Run `npm install` to ensure dependencies are installed
2. Check if package.json has correct dependencies
3. Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

## Editor Configuration

### VS Code (Recommended)

Install the following extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Path Intellisense

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.rulers": [100],
  "editor.tabSize": 2
}
```

### Other Editors

Ensure your editor is configured to:
- Use Prettier for formatting
- Run ESLint on save
- Follow TypeScript strict mode
- Use 2 spaces for indentation
- Set line width limit to 100 characters

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use environment-specific configurations** for different environments
3. **Rotate API keys** regularly
4. **Use strong passwords** for database and admin accounts
5. **Enable HTTPS** in production
6. **Keep dependencies updated** to prevent security vulnerabilities
7. **Use environment-specific settings** for development, staging, and production

## Next Steps

After setup:
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
2. Read [BRANCH.md](./BRANCH.md) for branch strategy
3. Read [API.md](./API.md) (if available) for API documentation
4. Start coding! 🚀

## Getting Help

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review existing [GitHub Issues](https://github.com/yourusername/agri-ai-agent-frontend/issues)
3. Open a new issue with detailed information about your problem
4. Contact the development team for assistance

## Support

For support and questions:
- **Email**: support@example.com
- **GitHub**: [Repository Issues](https://github.com/yourusername/agri-ai-agent-frontend/issues)
- **Discord**: Join our community server

---

**Happy Coding!** 🚀
