# ==================================
# Multi-Stage Docker Build
# ==================================
# This Dockerfile uses a two-stage build process to:
# 1. Build the TypeScript application with all dev dependencies
# 2. Create a minimal production image with only runtime dependencies
#
# Benefits:
# - Smaller final image size (~200MB vs 500MB+)
# - No dev dependencies in production
# - Faster deployment and startup
# - Better security (fewer packages = smaller attack surface)
# ==================================

# ==================================
# Stage 1: Builder
# ==================================
# This stage compiles TypeScript to JavaScript
# and generates Prisma client with all necessary binaries

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker layer caching
# If package.json hasn't changed, npm ci will use cache
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies)
# Required for TypeScript compilation and testing
RUN npm ci

# Copy application source code
# Done after npm ci to maximize cache hit ratio
COPY . .

# Generate Prisma client for both platforms
# - Native (Windows/Mac for development)
# - linux-musl-openssl-3.0.x (Alpine Linux for production)
# Configured in prisma/schema.prisma binaryTargets
RUN npx prisma generate

# Compile TypeScript to JavaScript
# Output goes to /app/dist directory
RUN npm run build

# ==================================
# Stage 2: Production
# ==================================
# This stage creates the final production image
# Contains only runtime dependencies and compiled code

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
# --only=production skips devDependencies (TypeScript, testing tools, etc.)
# This significantly reduces image size
RUN npm ci --only=production

# Generate Prisma client specifically for Alpine Linux
# Must regenerate here because builder stage may have generated for different platform
# The binaryTargets in schema.prisma ensures correct binary is included
RUN npx prisma generate

# Copy compiled JavaScript application from builder stage
# Only copy /dist, not source TypeScript files
COPY --from=builder /app/dist ./dist

# ==================================
# Security: Non-Root User
# ==================================
# Running as non-root reduces security risks
# Create dedicated user/group for the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Transfer ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user for all subsequent commands
USER nestjs

# ==================================
# Container Configuration
# ==================================

# Expose application port
# Must match PORT environment variable (default: 3000)
EXPOSE 3000

# Health check for container orchestration
# - Checks /api/health endpoint every 30 seconds
# - Waits 10 seconds after startup before first check
# - Allows 3 seconds per check before timeout
# - Marks unhealthy after 3 consecutive failures
# Used by Docker, Kubernetes, AWS ECS, etc.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the NestJS application
# Runs compiled JavaScript (not TypeScript)
# Migrations are run automatically via docker-compose command
CMD ["node", "dist/main.js"]
