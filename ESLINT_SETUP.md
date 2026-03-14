# ESLint Configuration Automation

This document describes the ESLint setup, automation, and CI/CD integration for the Agri AI Agent Frontend project.

## 📋 Overview

ESLint is configured to enforce code quality standards across the codebase. Custom ESLint rules are available for specific error handling patterns.

## 🚀 Quick Start

### Development

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check only JavaScript/TypeScript files
npx eslint src --ext .ts,.tsx
```

### CI/CD Integration

Linting is automatically enforced in CI pipelines:
- Pre-commit hooks check code quality
- Pull requests must pass linting checks
- Production builds will fail if linting issues are present

## 🔧 Configuration Files

### `.eslintrc.json`

Base ESLint configuration extending Next.js and TypeScript defaults with custom rules.

**Key Rules:**
- TypeScript strict checks (no `any`, no unused vars)
- React Hooks best practices
- Browser/Node environments
- Code quality (prefer-const, eqeqeq)

### `eslint-rules/error-handling.js`

Custom ESLint rules for enforcing proper error handling in API routes.

**Rules Defined:**
1. **`no-simple-error-responses`**: Enforces use of ErrorBuilder classes instead of simple `NextResponse.json()` with error status codes
2. **`require-error-builders`**: Ensures ErrorBuilder imports are present in API routes

### `lint-staged.config.js` (New)

Automates linting on staged files for pre-commit quality checks.

## 🎯 Custom Rules Details

### Error Handling Rules

The custom error handling rules ensure consistent error responses throughout the application.

**Why ErrorBuilder?**
- Consistent error format across the application
- Structured error details for better debugging
- Centralized error handling logic
- Easier to extend error types

**Usage Example:**

```typescript
// ❌ Before (Forbidden by custom rule)
return NextResponse.json(
  { error: "Something went wrong" },
  { status: 500 }
);

// ✅ After (Required)
import { ErrorBuilder } from "@/lib/error-details";

return ErrorBuilder
  .database("Database operation failed")
  .withStatus(500)
  .build();
```

## 🔄 Automation

### Pre-commit Hook

Files staged for commit are automatically linted before being committed.

```bash
npx lint-staged
```

### CI/CD Pipeline

The CI pipeline includes:
1. Run linting checks on all changes
2. Fail if any linting issues are found
3. Report linting statistics

## 📊 Linting Statistics

Running `npm run lint` will show:
- Total files checked
- Total errors found
- Total warnings found
- Fixable errors (with `npm run lint:fix`)

## 🚨 Troubleshooting

### "No such file or directory: 'node_modules/.bin/lint-staged'"

Run: `npm install`

### Linting issues can't be auto-fixed

Check that your editor is configured to use ESLint. The issue might be:
- Formatting issues (use `npm run format`)
- Complex refactoring needed (review manually)

## 📚 Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Next.js ESLint Config](https://github.com/vercel/next.js/blob/canary/eslint.config.js)
- [TypeScript ESLint](https://typescript-eslint.io/)

## 🔄 Migration Guide

If you're upgrading from a previous ESLint setup:

1. Review the current `.eslintrc.json` configuration
2. Run `npm run lint` to see all current issues
3. Run `npm run lint:fix` to auto-fix fixable issues
4. Manually review and fix remaining issues
5. Commit your changes

## 📝 Adding Custom Rules

To add a new custom rule:

1. Create a new file in `eslint-rules/`
2. Export the rule configuration
3. Import and use it in `.eslintrc.json`

Example:
```javascript
// eslint-rules/my-custom-rule.js
module.exports = {
  rules: {
    'my-custom-rule': {
      meta: { /* rule metadata */ },
      create(context) { /* rule implementation */ }
    }
  }
};
```
