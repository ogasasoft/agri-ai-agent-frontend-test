# CI/CD Pipeline

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment. The pipeline runs automatically on push to main, feature branches, and pull requests.

## Workflow Diagram

```
push/PR → Type Check → Lint → Tests → Build → Security Scan → Deploy
                     ↓
                 Accessibility
                     ↓
                Performance
```

## Pipeline Stages

### 1. Type Check (TypeScript)

- **Job**: `typecheck`
- **Purpose**: Validate TypeScript types
- **Timeout**: 5 minutes
- **Node Version**: 20.x

### 2. Lint Check

- **Job**: `lint`
- **Purpose**: Run ESLint and Prettier checks
- **Dependencies**: typecheck
- **Timeout**: 5 minutes
- **Node Version**: 20.x

### 3. Test Suite

- **Job**: `test`
- **Purpose**: Run Jest tests with coverage
- **Dependencies**: lint, typecheck
- **Timeout**: 15 minutes
- **Coverage**: Uploaded to Codecov
- **Node Version**: 20.x
- **Features**:
  - Test coverage reporting
  - PR coverage comments (via lighthouse-ci-action)
  - Parallel test execution (maxWorkers=2)

### 4. Build Check

- **Job**: `build`
- **Purpose**: Build production bundle
- **Dependencies**: lint, test
- **Timeout**: 15 minutes
- **Node Version**: 20.x
- **Output**: Build artifacts stored for 7 days

### 5. Accessibility Check

- **Job**: `accessibility`
- **Purpose**: Run Pa11y accessibility scan
- **Dependencies**: build
- **Timeout**: 5 minutes
- **Threshold**: WCAG 2.1 AA level

### 6. Security Audit

- **Job**: `security-scan`
- **Purpose**: Check for vulnerabilities
- **Dependencies**: test
- **Timeout**: 5 minutes
- **Tools**: npm audit, Snyk
- **Optional**: Skip with workflow input `skip-security: true`

### 7. Performance Check

- **Job**: `performance`
- **Purpose**: Run Lighthouse CI performance audit
- **Dependencies**: build
- **Timeout**: 5 minutes
- **Tools**: Lighthouse CI

### 8. Deploy (Conditional)

- **Deploy to Preview** (on PR): Uses Vercel Preview deployment
- **Deploy to Production** (on main push): Uses Vercel Production deployment

## Trigger Conditions

- **Push**: main, feature/_, update/_, fix/\* branches
- **Pull Request**: Any PR targeting main
- **Manual**: Workflow dispatch with optional inputs

## Manual Workflow Run

```bash
# Run with test-only mode
gh workflow run ci.yml -f test-only=true

# Run with security scan disabled
gh workflow run ci.yml -f skip-security=true

# Run with test-only and security disabled
gh workflow run ci.yml -f test-only=true -f skip-security=true
```

## Required GitHub Secrets

Configure these secrets in your repository settings:

- `VERCEL_TOKEN`: Vercel authentication token
- `ORG_ID`: Vercel organization ID
- `PROJECT_ID`: Vercel project ID
- `SNYK_TOKEN`: Snyk security token (optional)

## Test Coverage

Coverage reports are automatically uploaded to Codecov. View coverage here:

- **Codecov**: [Your Codecov URL]

### Local Coverage Reports

```bash
# View coverage
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Generate coverage report in terminal
npm run test:ci
```

## Build Artifacts

Production builds are uploaded as artifacts and available for:

- Downloading
- Static site hosting
- Performance testing
- Debugging

Artifacts are kept for 7 days.

## Security Best Practices

1. **Secrets Management**: Never commit secrets to the repository
2. **Dependency Audit**: Run `npm audit` regularly
3. **Node Version**: Use `.nvmrc` for consistent versions
4. **Test Coverage**: Maintain >80% coverage
5. **Accessibility**: Maintain WCAG 2.1 AA compliance

## Troubleshooting

### Pipeline Fails on Type Check

```bash
npm run typecheck
```

### Pipeline Fails on Lint

```bash
npm run lint:fix
npm run format
```

### Pipeline Fails on Tests

```bash
npm run test:watch
npm run test:watch:coverage
```

### Pipeline Fails on Build

```bash
npm run build
npm run preview
```

### Local Testing

```bash
# Run full pipeline locally
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

## Continuous Integration Checklist

- [ ] All tests pass (187 tests)
- [ ] Coverage threshold met (target: 80%)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Build succeeds
- [ ] Accessibility scan passes (WCAG 2.1 AA)
- [ ] Security audit passes
- [ ] Performance audit passes (Lighthouse > 90)
- [ ] Documentation updated

## Integration with Development Workflow

1. Create feature branch
2. Make changes and run local tests
3. Push to repository
4. CI pipeline runs automatically
5. Review CI results
6. Fix any failures
7. Deploy to preview on PR
8. Merge to main (after approval)
9. Production deployment
