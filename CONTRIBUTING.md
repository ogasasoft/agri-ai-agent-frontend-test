# Contributing to Agri AI Agent Frontend

Thank you for your interest in contributing to this project!

## Development Setup

### Prerequisites

- Node.js 18+ installed via nvm
- PostgreSQL database (for development)
- OpenAI API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agri-ai-agent-frontend-test

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
agri-ai-agent-frontend-test/
├── src/
│   ├── app/                  # Next.js 14 App Router pages
│   │   ├── admin/           # Admin pages
│   │   ├── api/             # API Routes
│   │   ├── orders/          # Order management
│   │   └── login/           # Login pages
│   ├── components/          # Reusable components
│   ├── lib/                 # Utility functions
│   └── stores/              # Zustand state management
├── public/                  # Static assets
├── __tests__/               # Test files
├── jest.config.js           # Jest configuration
├── tsconfig.json            # TypeScript configuration
├── next.config.js           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### Available CI Jobs

#### TypeScript Type Check

- **Run**: `npm run typecheck`
- **Purpose**: Verify TypeScript type safety
- **Priority**: First in pipeline

#### ESLint Check

- **Run**: `npm run lint`
- **Purpose**: Check code quality and catch errors
- **Priority**: Second in pipeline (depends on typecheck)

#### Prettier Check

- **Run**: `npm run format:check`
- **Purpose**: Ensure consistent code formatting
- **Priority**: Third in pipeline (depends on lint)

#### Test Suite

- **Run**: `npm run test`
- **Purpose**: Run all tests with coverage
- **Priority**: Fourth in pipeline (depends on lint and typecheck)
- **Coverage Report**: Automatically uploaded to Codecov

#### Build Check

- **Run**: `npm run build`
- **Purpose**: Verify production build
- **Priority**: Fifth in pipeline (depends on lint and test)
- **Artifact**: Production build uploaded for preview

#### Security Audit

- **Run**: `npm audit --audit-level=moderate`
- **Purpose**: Check for security vulnerabilities
- **Priority**: Sixth in pipeline (depends on test)
- **Action**: Fail if moderate or higher vulnerabilities found

### Trigger Conditions

CI pipeline runs on:

- Push to `main` branch
- Push to `feature/*` or `update/*` branches
- Pull requests targeting `main` branch
- Manual workflow dispatch

### Workflow Diagram

```
push/pr
  ↓
[TypeScript Check] → [Lint] → [Prettier Check] → [Tests] → [Build] → [Security Audit]
  ↓
  ✅ All Passed: Branch is ready for review
  ❌ Failed: Fix errors and commit again
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests in CI Mode

```bash
npm run test:ci
```

### Test Structure

The project has comprehensive test coverage including:

- **Component Tests**: All React components
- **Page Tests**: Route handling and rendering
- **API Tests**: Backend API endpoints
- **Utility Tests**: Helper functions and utilities

### Expected Results

- **Test Suites**: All test suites should pass
- **Tests**: 100% of tests should pass
- **Coverage**: High coverage for critical paths
- **Build**: Zero TypeScript errors
- **Lint**: Zero ESLint errors

## Code Style

### TypeScript

- Use strict mode: `tsconfig.json` is already configured
- Prefer explicit typing over `any`
- Use interfaces and types for object shapes
- Follow TypeScript best practices

### React

- Functional components with hooks
- Use Tailwind CSS for styling
- Use React Hook Form for forms
- Use Zod for validation

### JavaScript

- ES6+ features only
- Use const/let instead of var

### Git Commits

Follow conventional commits format:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
ci: CI/CD changes
```

Example:

```
feat: add customer management page
fix: correct shipping API response parsing
docs: update installation instructions
ci: add TypeScript type check to CI pipeline
```

### Branch Naming

- `feature/`: New feature
- `fix/`: Bug fix
- `docs/`: Documentation changes
- `refactor/`: Code refactoring
- `test/`: Test-related changes
- `ci/`: CI/CD changes
- `update/`: Updates to existing features

Example:

```
feature/add-customer-management
fix/dashboard-rendering-error
docs/api-endpoints
ci/add-typecheck-job
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and add tests
3. Run quality checks before committing:
   ```bash
   npm run typecheck  # TypeScript check
   npm run lint       # ESLint check
   npm run test       # Run tests
   ```
4. Commit with conventional commit message
5. Push to your branch
6. Open a Pull Request

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] TypeScript has no errors
- [ ] ESLint has no errors
- [ ] New features are tested
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

## Security

This project adheres to security-first principles:

- **Input Validation**: All user inputs are validated
- **SQL Injection Prevention**: Use parameterized queries
- **CSRF Protection**: All state-changing operations include CSRF tokens
- **Rate Limiting**: Implement rate limiting on API endpoints
- **Secret Management**: Never commit secrets to the repository
- **Audit Logging**: Track all sensitive operations

### Security Best Practices

1. Use environment variables for sensitive data
2. Hash passwords using bcrypt
3. Use HTTPS in production
4. Keep dependencies updated
5. Run security audits regularly

## Getting Help

- Check existing issues for open questions
- Review project documentation
- Ask questions in GitHub Discussions
- Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Code of Conduct

This project adheres to a friendly, inclusive code of conduct. Please be respectful and professional in all interactions.

---

Happy coding! 🚀
