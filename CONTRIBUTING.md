# Contributing to Agri AI Agent Frontend

Thank you for your interest in contributing to this project!

## Development Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon or similar)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agri-ai-agent-frontend-test

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
# DATABASE_URL=postgresql://username:password@host:port/database
# OPENAI_API_KEY=sk-your-key

# Run database migrations (first time only)
npm run dev
# Access http://localhost:3000/api/migrate-auth
# Access http://localhost:3000/api/migrate-security-enhancements
# Access http://localhost:3000/api/migrate-admin-system

# Start development server
npm run dev
```

## Project Structure

```
agri-ai-agent-frontend/
├── src/
│   ├── app/
│   │   ├── api/            # API Routes
│   │   │   ├── admin/      # Admin APIs
│   │   │   ├── auth/       # Authentication APIs
│   │   │   ├── orders/     # Order management APIs
│   │   │   └── chat/       # AI chat APIs
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── orders/         # Order management pages
│   │   ├── login/          # Login page
│   │   └── change-password/ # Password change page
│   ├── components/         # React components
│   ├── lib/                # Utility functions
│   │   ├── auth.ts         # Authentication utilities
│   │   ├── auth-enhanced.ts # Security features
│   │   └── admin-auth.ts   # Admin authentication
│   └── stores/             # Zustand state management
├── __tests__/              # Test files
├── public/                 # Static assets
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript configuration
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Type Checking
npm run typecheck    # TypeScript type checking

# Linting
npm run lint         # Run ESLint (may have issues with eslint-config-next@16)
npm run lint:fix     # Auto-fix linting issues

# Formatting
npm run format:check # Check code formatting
npm run format       # Format code with Prettier
```

## Testing

### Run All Tests
```bash
npm test
```

Expected: **199 passed, 199 total**

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- --testPathPattern=orders.test.ts
```

## Code Style

### TypeScript
- Strict mode enabled in `tsconfig.json`
- Avoid `any` types when possible
- Use interfaces for object shapes
- Prefer `const` and `let` over `var`

### Security First
- Never log sensitive data (passwords, tokens)
- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization

### Error Handling
- Use the error builder pattern for consistent error messages
- Provide meaningful error messages to users
- Log errors in production (but don't expose them to clients)

## Authentication & Authorization

### User Roles
- **Regular User**: Can access orders, chat, and profile
- **Super Admin**: Can access admin dashboard, manage customers, configure AI prompts

### Testing Credentials
- **Regular User**: `admin` / `admin123`
- **Super Admin**: `silentogasasoft@gmail.com` / `Ogasa1995`

### Admin API Security
- All admin APIs require authentication
- Super admin role verification
- CSRF token validation

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/login-enhanced` - Enhanced login with rate limiting
- `POST /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/change-password` - Change password

### Orders
- `POST /api/orders` - Register new order
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/:id` - Get specific order

### AI Chat
- `POST /api/chat` - Send message to AI (with context-aware responses)

### Admin
- `GET /api/admin/me` - Get admin information
- `GET /api/admin/dashboard-stats` - Get dashboard statistics
- `GET /api/admin/customers` - Get customer data

## Common Issues

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check SSL settings (Neon requires SSL)
- Ensure PostgreSQL is running

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is valid
- Check API quota and limits
- Test API key separately

### Auth Errors
- Session expired → Re-login
- CSRF token error → Reload the page
- Rate limited → Wait and retry

## Commit Messages

Follow conventional commits format:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
security: security-related changes
```

Example:
```
feat: add CSV order upload feature
fix: correct cartographic API response parsing
docs: update API documentation
security: add rate limiting to login endpoint
```

## Branch Naming

- `feature/`: New feature
- `fix/`: Bug fix
- `docs/`: Documentation changes
- `refactor/`: Code refactoring
- `test/`: Test-related changes
- `chore/`: Maintenance tasks
- `security/`: Security-related changes

Example:
```
feature/csv-upload
fix/whitespace-in-api-response
docs/api-endpoints
security/rate-limiting
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and add tests
3. Run `npm test` to ensure all tests pass (199 tests)
4. Run `npm run typecheck` to ensure TypeScript passes
5. Commit with conventional commit message
6. Push your branch
7. Open a Pull Request

## Security Guidelines

### When Making Changes

1. **Input Validation**: Validate all user inputs
2. **Authorization**: Check user roles before granting access
3. **Error Messages**: Don't expose sensitive information
4. **Rate Limiting**: Implement rate limiting for public APIs
5. **CSRF Protection**: Use CSRF tokens for state-changing requests
6. **SQL Injection Prevention**: Use parameterized queries

### Testing Security Features

1. Test with different user roles (admin vs regular user)
2. Test edge cases (empty inputs, special characters)
3. Test rate limiting (multiple rapid requests)
4. Test CSRF protection
5. Test Remember Me functionality

## Getting Help

- Check existing issues for open questions
- Review project documentation
- Ask questions in GitHub Discussions

## License

This project is private and licensed for internal use only.

## Code of Conduct

This project adheres to a friendly, inclusive code of conduct. Please be respectful and professional in all interactions.

---

Happy coding! 🚀
