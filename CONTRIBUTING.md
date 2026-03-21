# Contributing to Agri AI Agent Frontend

Thank you for your interest in contributing to this project!

## Development Setup

### Prerequisites
- Node.js 20+ installed via nvm
- npm or yarn package manager
- PostgreSQL database (Neon recommended)
- OpenAI API key for testing AI features
- Yamato Transport API credentials (for production shipping)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agri-ai-agent-frontend-test

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up database (see README.md for setup instructions)
npm run db:migrate

# Run development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
agri-ai-agent-frontend-test/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── customers/     # Customer management
│   │   │   ├── prompts/       # AI prompt configuration
│   │   │   └── integrations/  # API integration settings
│   │   ├── api/               # API Routes
│   │   │   ├── admin/         # Admin-only APIs
│   │   │   ├── auth/          # Authentication APIs
│   │   │   ├── orders/        # Order management APIs
│   │   │   ├── chat/          # AI chat APIs
│   │   │   ├── shipping/      # Shipping APIs (Yamato)
│   │   │   └── yamato/        # Yamato API routes
│   │   ├── orders/            # Order management pages
│   │   ├── login/             # Login page
│   │   ├── change-password/   # Password change page
│   │   └── [...nextauth]/     # NextAuth authentication
│   ├── components/            # Shared components
│   │   ├── ui/               # UI components (shadcn/ui)
│   │   ├── layout/           # Layout components
│   │   └── features/         # Feature-specific components
│   ├── lib/                   # Utility functions
│   │   ├── db.ts             # Database client
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── auth-enhanced.ts  # Enhanced security features
│   │   ├── admin-auth.ts     # Admin authentication
│   │   └── api-error-details # Error handling
│   ├── types/                # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── shipping.ts
│   │   ├── yamato.ts
│   │   └── api.ts
│   ├── stores/               # Zustand state management
│   └── middleware.ts         # Request middleware
├── __tests__/                # Test files
├── SYSTEM_ARCHITECTURE.md    # Comprehensive system documentation
├── ROADMAP.md               # Feature roadmap
├── package.json
└── tsconfig.json
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests for specific file
```bash
npm test -- --testPathPattern=shipping.test.ts
```

### Database testing
```bash
# Start PostgreSQL (using Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres

# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

## Code Style

### TypeScript
- Use strict mode: `tsconfig.json` is already configured
- Prefer explicit typing over `any`
- Use interfaces for object shapes
- Type all function parameters and return values

### React
- Functional components with hooks only
- Use shadcn/ui components as base
- Follow the existing component patterns
- Add loading states and error boundaries
- Use server components for data fetching where appropriate

### API Routes (Next.js)
- Use server actions where possible
- Implement proper error handling with `AuthErrorBuilder` and `DatabaseErrorBuilder`
- Use database connection pool (`getDbClient()`)
- Add session validation for all API routes
- Implement CSRF protection for state-changing operations

### Security
- Always validate sessions in API routes
- Use prepared statements to prevent SQL injection
- Hash passwords with bcrypt (already implemented)
- Implement rate limiting for authentication endpoints
- Use HTTPS in production
- Follow OWASP security guidelines

### Database
- Use PostgreSQL features: RLS (Row Level Security), partial indexes
- Use connection pooling with `pg`
- Implement transaction management for multi-step operations
- Add database indexes for frequently queried columns
- Use UUIDs for primary keys

### JavaScript
- ES6+ features only
- Use `const`/`let` instead of `var`
- Prefer arrow functions
- Use template literals for strings
- Use `const` for object/array literals

## Database Schema

### Key Tables
- **users**: User accounts with roles (regular, admin, super_admin)
- **sessions**: Session management with CSRF tokens
- **orders**: Order data from EC platforms
- **customers**: Customer information (auto-generated from orders)
- **system_settings**: System configuration and AI prompts
- **api_integrations**: External API credentials and status

### Migration Process
```bash
# Create new migration
npm run db:migrate:create add-users-table

# Run migrations
npm run db:migrate

# Rollback migrations
npm run db:migrate:rollback
```

## API Development

### Creating a New API Route

1. **Create the route file** in `src/app/api/your-feature/route.ts`
2. **Add TypeScript types** in `src/types/your-feature.ts`
3. **Implement authentication** if needed:
   ```typescript
   const sessionData = await validateSession(sessionToken);
   if (!sessionData) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```
4. **Use database client**:
   ```typescript
   const client = await getDbClient();
   try {
     // Your database queries here
     const result = await client.query('SELECT * FROM users');
     return NextResponse.json(result.rows);
   } finally {
     await client.end();
   }
   ```
5. **Add tests** in `__tests__/api/your-feature.test.ts`
6. **Update this CONTRIBUTING.md** if adding new conventions

### API Documentation
- API routes should follow REST conventions
- Use proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Return JSON responses with consistent structure:
   ```json
   {
     "success": true/false,
     "data": {},
     "message": "Optional message"
   }
   ```
- Include error details in production for debugging

## Authentication & Authorization

### User Roles
- **regular**: Standard user (no special permissions)
- **admin**: Admin with full access to admin dashboard
- **super_admin**: Super admin with access to all features

### Session Management
- Use session tokens from HTTP headers: `x-session-token`
- CSRF tokens required for state-changing operations
- Session automatically extends before expiration
- Sessions last 2 hours by default

### Multi-Factor Authentication
- MFA is enforced for admin accounts
- Uses session + CSRF token approach
- Remember Me option available (30 days)

## Error Handling

### Use Error Builders
```typescript
// For authentication errors
return NextResponse.json(
  { error: 'Authentication failed' },
  { status: 401 }
);

// For database errors
return NextResponse.json(
  { error: 'Database operation failed' },
  { status: 500 }
);
```

### Error Builders Available
- `AuthErrorBuilder` - For authentication errors
- `DatabaseErrorBuilder` - For database errors
- `AuthErrorDetails` - For detailed auth error messages

## Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** and add comprehensive tests

3. **Run all tests** to ensure nothing is broken:
   ```bash
   npm test
   ```

4. **Run linter**:
   ```bash
   npm run lint
   ```

5. **Commit with conventional commit messages**:
   ```
   feat: add new feature
   fix: fix bug
   docs: update documentation
   style: code formatting changes
   refactor: code refactoring
   test: add or update tests
   chore: maintenance tasks
   ```

6. **Push your branch**:
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request** on GitHub

### PR Checklist
- [ ] All tests pass
- [ ] Code follows project style guidelines
- [ ] New features have tests
- [ ] Documentation updated if necessary
- [ ] No console.log or debug statements in production code
- [ ] Database migrations (if applicable) are reversible
- [ ] API routes have proper error handling
- [ ] Security review performed (auth, input validation, SQL injection)

## Testing Your Changes

1. **Local Testing**:
   ```bash
   npm test          # Run all tests
   npm test -- --watch  # Run tests in watch mode
   ```

2. **Manual Testing**:
   - Start development server: `npm run dev`
   - Test authentication flow
   - Test API endpoints
   - Check database changes

3. **Database Testing**:
   ```bash
   npm run db:migrate     # Run migrations
   npm run db:seed        # Seed test data
   ```

## Getting Help

- Read `SYSTEM_ARCHITECTURE.md` for detailed system information
- Check `ROADMAP.md` for planned features and current status
- Review existing code and tests for examples
- Open an issue if you find a bug or have a question
- Join the discussion in GitHub Discussions

## Code of Conduct

This project adheres to a friendly, inclusive code of conduct. Please be respectful and professional in all interactions.

## License

This project is private and licensed under internal use only.

## Security Policy

If you discover a security vulnerability, please email the maintainers privately. Do not disclose security issues publicly before they have been fixed.

---

Happy coding! 🚀
