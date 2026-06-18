# Development Branches

This document outlines the branch strategy for the Agri AI Agent Frontend project.

## Branch Naming Convention

All branches follow the pattern: `<type>/<description>-<date>`

### Branch Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation improvements
- **test**: Test-related changes
- **refactor**: Code refactoring without functionality changes
- **chore**: Maintenance tasks

### Branch Descriptions

- Short, descriptive names (3-10 characters preferred)
- Use lowercase letters
- Use hyphens instead of spaces

### Date Format

- YYYY-MM-DD (ISO 8601)

## Examples

```
feat/user-auth-2026-06-18
fix/database-connection-2026-06-18
docs/update-readme-2026-06-18
test/add-api-tests-2026-06-18
refactor/util-functions-2026-06-18
chore/update-dependencies-2026-06-18
```

## Branch Strategy

### Main Branch
- **main**: Production-ready code
- Protected branch requiring PR reviews
- Only merged through pull requests

### Feature Branches
- Created from `main`
- Work on isolated features
- Merged back to `main` after completion

### Hotfix Branches
- Created from `main` for urgent fixes
- Merged to both `main` and development branches
- Should be backported to other branches if applicable

## Workflow

1. **Create feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/<feature-name>-<date>
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to remote**
   ```bash
   git push origin feat/<feature-name>-<date>
   ```

4. **Create pull request**
   - Target: `main` branch
   - Title: Clear, descriptive title
   - Description: Summary of changes, testing done

5. **Code review**
   - At least one reviewer approval required
   - Address feedback from reviewers

6. **Merge to main**
   - Once approved, merge via pull request
   - Delete feature branch after merge

## Branch Protection Rules

### Required Settings

- **Require pull request before merging**: ✅ Enabled
- **Require status checks to pass**: ✅ Enabled
  - TypeScript check
  - ESLint check
  - Tests
  - Build
- **Require conversation resolution**: ✅ Enabled
- **Do not allow bypassing the above settings**: ✅ Enabled

### Additional Rules

- Branch names must follow the naming convention
- Feature branches should be deleted after merging
- Hotfix branches should be deleted after backporting

## Reference

For detailed branch management, see [CONTRIBUTING.md](./CONTRIBUTING.md)
