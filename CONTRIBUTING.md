# Contributing to Agri AI Agent Frontend

Thank you for your interest in contributing to this project!

## Development Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database for local development
- OpenAI API key (for AI chat functionality testing)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agri-ai-agent-frontend-test

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Update .env.local with your credentials
# - DATABASE_URL
# - OPENAI_API_KEY
# - (Optional) YAMATO_API_KEY, YAMATO_API_SECRET
```

### Project Structure

```
agri-ai-agent-frontend-test/
├── src/
│   ├── __tests__/          # Test files organized by feature
│   ├── api/                # API route handlers
│   ├── components/         # React components
│   ├── lib/                # Utility functions and helpers
│   ├── types/              # TypeScript type definitions
│   └── app/                # Next.js App Router pages
├── public/                 # Static assets
├── .env.local              # Environment variables (local)
├── .env.example            # Environment variables template
└── package.json            # Dependencies and scripts
```

## Development

### Running the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building for Production

```bash
npm run build
npm run start
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests for Specific File

```bash
npm test <test-file-name>
```

## Code Quality

### Linting

```bash
npm run lint
```

### Fix Linting Issues Automatically

```bash
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## Error Handling Guidelines

Please refer to [ERROR_HANDLING_RULES.md](ERROR_HANDLING_RULES.md) for detailed information on error handling conventions.

## Testing Guidelines

Please refer to [TEST_ERROR_CHECKLIST.md](TEST_ERROR_CHECKLIST.md) for detailed information on testing conventions.

## Code Style

- Use TypeScript for type safety
- Follow the project's existing code style
- Write meaningful comments for complex logic
- Keep functions small and focused
- Use descriptive variable and function names
- Write unit tests for new features
- Update documentation as needed

## Commit Messages

Follow conventional commit format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
- `feat: add user authentication flow`
- `fix: resolve shipping API error handling`
- `docs: update README with new features`
- `test: add comprehensive error handling tests`

## Pull Request Process

1. Create a new branch from main
2. Make your changes and add tests
3. Run `npm test` and `npm run lint` to ensure everything passes
4. Commit your changes with descriptive messages
5. Push to your branch
6. Create a pull request with a clear description

## Getting Help

If you have questions about the project or need help getting started:

1. Check existing documentation in the project
2. Review test files for examples
3. Open an issue on GitHub

## Security

Please be aware that this project handles sensitive data including:
- User authentication credentials
- Order data
- Customer information

When working on security-related features:
- Always use secure password hashing (bcryptjs)
- Validate all user inputs
- Sanitize all data before database operations
- Use environment variables for sensitive configuration
- Review PRs for security best practices

## Dependencies

When adding new dependencies:
1. Check if the functionality is available in existing packages
2. Prefer stable, well-maintained packages
3. Check for security vulnerabilities using `npm audit`
4. Update all related tests when adding new dependencies
5. Document the purpose of new dependencies

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md with changes
3. Update documentation if needed
4. Run full test suite
5. Create pull request for review
6. After approval, merge to main
7. Create release tag
8. Deploy to production

## License

This project uses the MIT License. Please see LICENSE file for details.
