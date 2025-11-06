# CI/CD Database Connection Fix

## Issue Summary

The CI/CD pipeline was failing with the error: **"role 'root' does not exist"** in PostgreSQL during integration tests.

## Root Cause

Mismatch between CI database credentials and test setup fallback configuration:

- **CI/CD PostgreSQL Service**: `user=test`, `password=test`, `database=test_db`
- **Test Setup Fallback**: `user=dev`, `password=dev`, `database=powerplants_test`

When the CI environment didn't have `DATABASE_URL` or `DATABASE_URL_TEST` explicitly set in the test runner step, the test setup files fell back to hardcoded credentials that didn't match the CI PostgreSQL service.

## Solution Applied

### 1. Updated Test Setup Files

**Files Modified:**
- `test/setup.ts`
- `test/setup.js`

**Change:** Updated fallback DATABASE_URL from:
```typescript
"postgresql://dev:dev@localhost:5432/powerplants_test"
```

To:
```typescript
"postgresql://test:test@localhost:5432/test_db"
```

This ensures the fallback credentials match the CI PostgreSQL service configuration.

### 2. Created `.env.test` File

**New File:** `.env.test`

Documented the test database configuration for consistency and clarity. This file can be used locally for running integration tests.

### 3. CI/CD Configuration (Already Correct)

The `.github/workflows/ci.yml` was already correctly configured:

```yaml
services:
  postgres:
    image: postgres:14-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
```

And the integration test step explicitly sets `DATABASE_URL`:

```yaml
- name: Run integration tests
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    REDIS_HOST: localhost
    REDIS_PORT: 6379
    NODE_ENV: test
  run: npm run test:integration
```

## Verification Steps

To verify the fix works:

1. **Locally:** Run integration tests
   ```bash
   npm run test:integration
   ```

2. **CI/CD:** Push changes and monitor the GitHub Actions workflow
   - The integration tests should now pass
   - Look for the "Integration Tests" job to complete successfully

## Why This Fix Works

1. **Explicit Environment Variable**: The CI workflow already sets `DATABASE_URL` explicitly in the integration test step, so it will use the correct credentials
2. **Fallback Alignment**: If for any reason the explicit env var isn't set, the fallback now matches the CI PostgreSQL service
3. **Consistency**: All test configurations now use the same credentials (`test:test@localhost:5432/test_db`)

## Related Files

- `.github/workflows/ci.yml` - CI/CD pipeline configuration
- `test/setup.ts` - Jest setup file (TypeScript source)
- `test/setup.js` - Jest setup file (compiled JavaScript)
- `.env.test` - Test environment variables (new)
- `prisma/schema.prisma` - Database schema

## Additional Notes

The CI workflow also correctly runs `npx prisma migrate deploy` before running tests, which ensures the test database schema is up to date.

## Next Steps

1. Commit these changes
2. Push to GitHub
3. Monitor the CI/CD pipeline
4. Verify all integration tests pass

If issues persist, check:
- Prisma migrations are compatible with the test database
- Test data seeding (if any) is working correctly
- No hardcoded database connections in repository implementations
