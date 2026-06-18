# Error Handling Guide

This guide provides comprehensive information about error handling in the Agri AI Agent Frontend application.

## Common Errors

### 1. Database Connection Errors

#### Error Message
```
Error: Can't reach database server
```

#### Causes
- Database is not running
- Incorrect connection string
- Firewall blocking connection
- Database doesn't exist

#### Solutions

**Check if database is running:**
```bash
psql $DATABASE_URL -c "SELECT version();"
```

**Verify connection string:**
```bash
# Test connection
psql $DATABASE_URL
```

**Check if database exists:**
```bash
psql $DATABASE_URL -c "\l"
```

**Recreate database (if needed):**
```bash
psql postgres -c "CREATE DATABASE agri_ai_agent;"
```

### 2. OpenAI API Errors

#### Error Message
```
Error: Invalid API key
Error: API key not found
```

#### Causes
- Invalid or expired API key
- Missing API key
- Insufficient API quota
- API key has incorrect permissions

#### Solutions

**Verify API key:**
```bash
# Check if key is set
echo $OPENAI_API_KEY

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Regenerate API key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Delete old key
3. Generate new key
4. Update `.env.local` with new key

**Check API quota:**
1. Check [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. Verify billing is set up
3. Check for rate limits

### 3. Authentication Errors

#### Error Message
```
Error: Invalid credentials
Error: Authentication failed
Error: Session expired
```

#### Causes
- Incorrect username/password
- Expired session
- CSRF token mismatch
- Rate limit exceeded

#### Solutions

**Check credentials:**
- Verify username: `admin`
- Verify password: `Ogasa1995` (or your custom password)

**Refresh session:**
- Log out
- Clear browser cache
- Log in again

**CSRF token error:**
- Refresh the page
- Re-submit the form

**Rate limit error:**
- Wait 15 minutes
- Contact administrator if issue persists

### 4. Build Errors

#### Error Message
```
Error: Can't resolve module
Error: TypeScript compilation failed
Error: ESLint errors found
```

#### Causes
- Missing dependencies
- TypeScript errors
- ESLint configuration issues
- Build cache corruption

#### Solutions

**Clean and reinstall:**
```bash
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

**Check TypeScript errors:**
```bash
npm run typecheck
```

**Fix ESLint errors:**
```bash
npm run lint:fix
```

**Clear build cache:**
```bash
rm -rf .next
npm run build
```

### 5. API Errors

#### Error Message
```
Error: API endpoint not found
Error: 500 Internal Server Error
Error: 503 Service Unavailable
```

#### Causes
- Wrong API endpoint URL
- Server is down
- Invalid request parameters
- Network connectivity issues

#### Solutions

**Check API endpoint:**
- Verify URL in code
- Test endpoint manually with curl

**Check server status:**
```bash
# Check if API server is running
curl http://localhost:3000/api/health

# Check logs
npm run dev
```

**Validate request parameters:**
- Check API documentation
- Verify all required fields are provided
- Check data types match expectations

### 6. Route Errors

#### Error Message
```
Error: 404 Not Found
Error: Cannot find module
```

#### Causes
- Incorrect route path
- Page component not found
- Server restart after code changes

#### Solutions

**Check route configuration:**
- Verify routes in `app/` directory
- Ensure page component exists
- Check file naming conventions

**Clear Next.js cache:**
```bash
rm -rf .next
npm run dev
```

**Restart development server:**
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

## Error Handling Best Practices

### Client-Side Error Handling

```typescript
// Try-catch for API calls
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    // Show error to user
    showError(error.message);
    // Retry logic could be added here
  }
}
```

### Server-Side Error Handling

```typescript
// API route error handling
export async function GET() {
  try {
    const data = await fetchDatabaseData();

    if (!data) {
      return NextResponse.json(
        { error: 'Data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### User-Friendly Error Messages

```typescript
// Create error handler component
function ErrorHandler({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="error-container">
      <h2>Error occurred</h2>
      <p>{error.message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
```

## Debugging Tips

### Enable Debug Mode

```env
# Add to .env.local
DEBUG=true
LOG_LEVEL=debug
```

### View Console Logs

**Development mode:**
```bash
npm run dev
# Console logs appear in terminal
```

**Browser developer tools:**
- Open Chrome DevTools (F12)
- Go to Console tab
- View error logs and network requests

### Check Application Logs

```bash
# Check recent logs
tail -f logs/app.log

# Check specific error logs
grep "ERROR" logs/app.log

# Check database logs
tail -f logs/database.log
```

### Database Error Logs

```bash
# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Check specific query errors
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

## Error Reporting

### How to Report Errors

1. **Collect error information:**
   - Error message
   - Error type (400, 404, 500, etc.)
   - Steps to reproduce
   - Environment (development/staging/production)
   - Browser and version

2. **Open GitHub Issue:**
   - Create new issue
   - Include error details
   - Add screenshots if applicable
   - Provide reproduction steps

3. **Include in issue:**
   ```markdown
   ## Error Description
   [Describe the error here]

   ## Error Message
   [Full error message]

   ## Steps to Reproduce
   1. Step 1
   2. Step 2

   ## Environment
   - Browser: Chrome 120
   - Environment: Development
   - Database: PostgreSQL 15

   ## Additional Context
   [Any other relevant information]
   ```

## Common Scenarios

### Scenario 1: Database Connection Fails on Startup

**Symptoms:**
- Application won't start
- Connection refused errors
- Application continues to run without database

**Solution:**
```bash
# Check database is running
psql $DATABASE_URL -c "SELECT 1;"

# Test connection string
psql $DATABASE_URL

# If connection string is wrong, update .env.local
nano .env.local
```

### Scenario 2: API Returns 401 Unauthorized

**Symptoms:**
- API calls fail with 401
- Auth errors in logs

**Solution:**
```bash
# Check if session token is set
echo $SESSION_TOKEN

# Clear cookies and restart
rm -rf cookies.json
npm run dev
```

### Scenario 3: Test Failures

**Symptoms:**
- Tests fail after code changes
- New errors introduced

**Solution:**
```bash
# Run specific test
npm test -- --testPathPattern=specific-test

# View detailed test output
npm test -- --verbose

# Rebuild and run tests
rm -rf node_modules .next
npm install
npm test
```

### Scenario 4: Memory Issues

**Symptoms:**
- High memory usage
- Application slows down
- Frequent crashes

**Solution:**
```bash
# Monitor memory usage
npm run dev -- --inspect

# In Chrome DevTools, go to Memory tab
# Take heap snapshots and compare
```

## Prevention Tips

1. **Use environment-specific configurations**
2. **Validate all user inputs**
3. **Implement proper error boundaries**
4. **Use try-catch blocks for async operations**
5. **Log errors with sufficient context**
6. **Set up error monitoring**
7. **Regular dependency updates**
8. **Backup database regularly**

## Additional Resources

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [TypeScript Error Handling](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [PostgreSQL Error Handling](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [OpenAI API Error Handling](https://platform.openai.com/docs/guides/rate-limits)

---

For additional help, refer to:
- [SETUP.md](./SETUP.md) - Development setup guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [BRANCH.md](./BRANCH.md) - Branch strategy
- [GitHub Issues](https://github.com/yourusername/agri-ai-agent-frontend/issues)
