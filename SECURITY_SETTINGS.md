# GitHub Security Settings

## Required Secrets

Configure these secrets in your GitHub repository:

### Repository Settings → Secrets and variables → Actions

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | Docker Hub username | `yourusername` |

### Docker Hub Credentials

1. Create a [Docker Hub account](https://hub.docker.com/)
2. Go to Account Settings → Security
3. Generate a new password/token
4. Add the token to GitHub Secrets

## Secrets for Local Development

### Environment Variables (Optional)

For local development with Docker Compose:

```bash
# Create .env.local
cp .env.example .env.local
```

Then update `.env.local` with your actual values.

### Git Ignore .env.local

Add `.env.local` to `.gitignore`:

```gitignore
# Environment variables
.env.local
.env.*.local
```

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use GitHub Secrets** for CI/CD
3. **Rotate tokens regularly** (every 90 days)
4. **Limit token permissions** (Docker Hub read/write)
5. **Enable branch protection rules** to require status checks

## Repository Security Settings

### Branch Protection

1. Go to Repository Settings → Branches
2. Add a new rule for `main`:
   - Require status checks to pass
   - Require pull request reviews before merging
   - Require branches to be up to date before merging
   - Include administrators

### Dependabot

Enable Dependabot in:
- Repository Settings → Security and analysis → Dependabot
- Select "Enable for both Python and JavaScript/TypeScript"

## Additional Security Tools

### npm audit

Automatically scans for vulnerabilities in dependencies:

```bash
# Scan all dependencies
npm audit

# Scan with severity levels
npm audit --audit-level=high

# Fix vulnerabilities automatically
npm audit fix

# Fix only known vulnerabilities
npm audit fix --force
```

### Docker Scan

Scan Docker images for vulnerabilities:

```bash
# Scan an image
docker scan agri-ai-frontend:latest

# Scan and fix
docker scan --fix agri-ai-frontend:latest
```

## Security Checklist

- [ ] All secrets configured in GitHub
- [ ] Dependabot enabled
- [ ] npm audit enabled in CI/CD
- [ ] Branch protection rules active
- [ ] Docker image scanned before release
- [ ] Regular security updates scheduled
- [ ] Security policy documented
- [ ] Vulnerability reporting process established
