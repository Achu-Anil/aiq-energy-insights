# Enhanced CI/CD Workflow Fix

## Recommended Updates to `.github/workflows/ci.yml`

If the basic fix doesn't work, apply these enhancements to make the CI pipeline more robust:

### Option 1: Add Explicit Environment Variables to ALL Steps

```yaml
test-integration:
  name: Integration Tests
  runs-on: ubuntu-latest
  
  # Set environment variables at the job level
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    DATABASE_URL_TEST: postgresql://test:test@localhost:5432/test_db
    TEST_SEED_YEAR: 2023
    NODE_ENV: test

  services:
    postgres:
      image: postgres:14-alpine
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: test_db
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432

    redis:
      image: redis:7-alpine
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 6379:6379

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"

    - name: Install dependencies
      run: npm ci

    - name: Generate Prisma Client
      run: npx prisma generate

    - name: Run database migrations
      run: npx prisma migrate deploy

    - name: Seed test database (if needed)
      run: npx prisma db seed || echo "No seed file or seed failed, continuing..."
      continue-on-error: true

    - name: Run integration tests
      run: npm run test:integration

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      if: always()
      with:
        files: ./coverage/lcov.info
        flags: integration
        name: integration-tests
        fail_ci_if_error: false
```

### Option 2: Add Debugging Steps

Insert these steps to diagnose the issue:

```yaml
- name: Debug PostgreSQL Connection
  run: |
    echo "DATABASE_URL: $DATABASE_URL"
    echo "Testing PostgreSQL connection..."
    psql "$DATABASE_URL" -c "SELECT version();" || echo "Connection failed!"

- name: Verify Prisma Client
  run: |
    echo "Prisma version:"
    npx prisma --version
    echo "Checking Prisma schema..."
    npx prisma validate

- name: Check compiled setup file
  run: |
    echo "Contents of test/setup.js:"
    cat test/setup.js | grep DATABASE_URL || echo "Not found"
```

### Option 3: Force Clean Build

If caching is the issue, add these steps:

```yaml
- name: Clean previous builds
  run: |
    rm -rf node_modules/.cache
    rm -rf dist/
    rm -f test/*.js test/*.js.map
    npm cache clean --force

- name: Install dependencies
  run: npm ci --prefer-offline=false

- name: Build TypeScript
  run: npm run build
```

## Complete Enhanced Workflow

Here's a complete replacement for the `test-integration` job with all fixes applied:

```yaml
test-integration:
  name: Integration Tests
  runs-on: ubuntu-latest

  # Job-level environment variables (available to all steps)
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    DATABASE_URL_TEST: postgresql://test:test@localhost:5432/test_db
    TEST_SEED_YEAR: 2023
    NODE_ENV: test
    REDIS_HOST: localhost
    REDIS_PORT: 6379

  services:
    postgres:
      image: postgres:14-alpine
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: test_db
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432

    redis:
      image: redis:7-alpine
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 6379:6379

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"

    - name: Clean build artifacts
      run: |
        rm -rf dist/
        rm -f test/*.js test/*.js.map

    - name: Install dependencies
      run: npm ci

    - name: Generate Prisma Client
      run: npx prisma generate

    - name: Verify Prisma setup
      run: npx prisma validate

    - name: Run database migrations
      run: npx prisma migrate deploy

    - name: Verify database connection
      run: |
        npx prisma db execute --stdin <<< "SELECT version();" || echo "Warning: Could not verify DB connection"

    - name: Seed test database
      run: npx prisma db seed
      continue-on-error: true

    - name: Debug environment
      run: |
        echo "NODE_ENV: $NODE_ENV"
        echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Print first 30 chars
        echo "TEST_SEED_YEAR: $TEST_SEED_YEAR"
        ls -la test/

    - name: Run integration tests
      run: npm run test:integration

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      if: always()
      with:
        files: ./coverage/lcov.info
        flags: integration
        name: integration-tests
        fail_ci_if_error: false
```

## Apply the Fix

### Quick Fix (Minimal Changes)

Just add job-level environment variables:

1. Open `.github/workflows/ci.yml`
2. Find the `test-integration` job
3. Add `env:` section right after `runs-on: ubuntu-latest`:

```yaml
test-integration:
  name: Integration Tests
  runs-on: ubuntu-latest
  
  env:  # ADD THIS SECTION
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    TEST_SEED_YEAR: 2023
    NODE_ENV: test
  
  services:
    postgres:
      # ... rest of config
```

### Full Fix (Recommended)

Replace the entire `test-integration` job with the complete enhanced workflow above.

## Why These Changes Help

1. **Job-level env vars**: Ensures DATABASE_URL is available to ALL steps, not just the test step
2. **Clean build artifacts**: Prevents stale compiled files from interfering
3. **Database verification**: Catches connection issues before tests run
4. **Debug output**: Shows exactly what the CI environment sees
5. **Seed database**: Ensures test data exists
6. **Explicit TEST_SEED_YEAR**: Matches local test environment

## Verification

After applying these changes:

1. Commit and push
2. Go to GitHub Actions tab
3. Watch the "Integration Tests" job
4. Check the "Debug environment" step output
5. Verify tests pass

If tests still fail, the debug output will show exactly what's wrong.
