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
"postgresql://dev:dev@localhost:5432/powerplants_test";
```

To:

```typescript
"postgresql://test:test@localhost:5432/test_db";
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

## Important Note: Compiled Files

The `test/setup.js` file is **ignored by Git** (per `.gitignore`) because it's a compiled output from `test/setup.ts`. 

**This is correct behavior:**
- Only the TypeScript source (`test/setup.ts`) is committed to Git
- The CI pipeline runs `npm ci` which installs dependencies
- Then the CI compiles TypeScript files, generating a fresh `test/setup.js` with the updated credentials
- This ensures the fix is applied in the CI environment

## Troubleshooting: If CI Still Fails

If the CI pipeline continues to fail with "role 'root' does not exist", try these steps:

### 1. Check GitHub Actions Cache

GitHub Actions may be caching node_modules or compiled files. To clear the cache:

```yaml
# Add this step before "Install dependencies" in ci.yml
- name: Clear npm cache
  run: npm cache clean --force
```

### 2. Verify DATABASE_URL is Set

Add a debug step to your CI workflow to confirm the environment variable:

```yaml
- name: Debug environment
  run: |
    echo "DATABASE_URL is set to: $DATABASE_URL"
    echo "NODE_ENV is: $NODE_ENV"
```

### 3. Check Prisma Client Generation

Ensure Prisma generates the client with the correct DATABASE_URL:

```yaml
- name: Generate Prisma Client
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
  run: npx prisma generate
```

### 4. Seed the Test Database

If tests fail because of missing data, add a seed step:

```yaml
- name: Seed test database
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    TEST_SEED_YEAR: 2023
  run: npx prisma db seed
```

### 5. Force TypeScript Recompilation

Ensure no stale compiled files exist:

```yaml
- name: Clean and build
  run: |
    rm -rf dist/
    rm -rf test/*.js
    npm run build
```

## Next Steps

1. ✅ Changes committed to Git
2. ✅ Pushed to GitHub (commit: 8fde0a7)
3. ⏳ Monitor the CI/CD pipeline
4. ⏳ Verify all integration tests pass

If issues persist, check:

- Prisma migrations are compatible with the test database
- Test data seeding (if any) is working correctly
- No hardcoded database connections in repository implementations
- GitHub Actions cache is not interfering
- All environment variables are properly set in each CI step
