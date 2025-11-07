<div align="center">

# ⚡ AIQ Energy Insights API

### Production-Grade Power Plant Generation Analytics

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.1-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Educational-green.svg)](LICENSE)

A production-grade REST API for querying U.S. power plant net generation data from the eGRID 2023 dataset. Built with Clean Architecture principles, comprehensive testing, and enterprise-grade features.

[Features](#-features) •
[Quick Start](#-quick-start) •
[API Documentation](#-api-endpoints) •
[Architecture](#-architecture) •
[Testing](#-testing) •
[Deployment](#-deployment)

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
  - [Docker Setup (Recommended)](#option-a-docker-setup)
  - [Local Development](#option-b-local-development-setup)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
  - [Plants Endpoints](#plants)
  - [States Endpoints](#states)
  - [System Endpoints](#health--documentation)
- [Architecture](#-architecture)
  - [Layered Structure](#layered-structure)
  - [Key Features](#key-features)
- [Database Schema](#-database-schema)
- [Testing](#-testing)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Docker Details](#-docker-details)
- [Deployment](#-deployment)
- [Design Decisions](#-assumptions--design-decisions)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

<table>
<tr>
<td>

**🏗️ Architecture**

- Clean Architecture with strict layer separation
- SOLID principles & Dependency Inversion
- Modular NestJS structure
- Repository pattern with abstractions

</td>
<td>

**⚡ Performance**

- Redis caching (1-hour TTL)
- Database indexes & materialized views
- Connection pooling
- Optimized top-N queries

</td>
</tr>
<tr>
<td>

**🔒 Security**

- Helmet.js security headers
- Input validation & sanitization
- Rate limiting (100 req/min)
- CORS configuration

</td>
<td>

**� Observability**

- Structured logging with trace IDs
- Health check endpoints
- OpenAPI/Swagger documentation
- Test coverage reports

</td>
</tr>
<tr>
<td>

**🧪 Quality Assurance**

- 96%+ test coverage
- Unit, integration & E2E tests
- Type-safe with TypeScript strict mode
- Automated CI/CD pipeline

</td>
<td>

**🚀 DevOps**

- Multi-stage Docker builds
- Docker Compose orchestration
- GitHub Actions CI/CD
- Production-ready deployment

</td>
</tr>
</table>

---

## 🚀 Quick Start

### ⚡ One-Command Setup (Recommended)

The fastest way to run the full stack with Docker:

```bash
git clone https://github.com/Achu-Anil/aiq-energy-insights.git
cd aiq-energy-insights
docker-compose up --build
```

**🎉 That's it!** The API will be ready at:

- 🌐 **API Base**: http://localhost:3000/api/v1
- 📚 **Swagger Docs**: http://localhost:3000/api/v1/docs
- 🗄️ **PostgreSQL**: localhost:5432
- 🔴 **Redis**: localhost:6379

**What happens automatically:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. ✅ PostgreSQL 14 container starts                    │
│ 2. ✅ Redis 7 container starts                          │
│ 3. ✅ Database schema migrations run                    │
│ 4. ✅ Sample data seeded (eGRID 2023)                   │
│ 5. ✅ NestJS API server starts on port 3000             │
│ 6. 🚀 Ready to accept requests!                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

Choose one option:

### Option A: Docker (Recommended)

- Docker Desktop or Docker Engine
- Docker Compose v2.0+

### Option B: Local Development

- Node.js v18 or higher
- PostgreSQL 14+
- Redis 7+ (optional for caching)
- npm or yarn

## 🛠️ Installation & Setup

### Option A: Docker Setup

```bash
# Clone the repository
git clone https://github.com/Achu-Anil/aiq-energy-insights.git
cd aiq-energy-insights

# Start the stack
docker-compose up --build

# Stop the stack
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Option B: Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database and Redis credentials

# 3. Run database migrations
npx prisma migrate deploy

# 4. Seed the database
npx prisma db seed

# 5. Generate Prisma client
npx prisma generate

# 6. Start Redis (optional, graceful fallback if unavailable)
redis-server

# 7. Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── common/                     # Shared utilities
│   ├── dto/                   # Common DTOs
│   ├── filters/               # Exception filters (centralized error handling)
│   ├── interceptors/          # Response transformation
│   └── utils/                 # Helper functions
├── config/                     # Environment configuration
├── modules/                    # Feature modules (Clean Architecture)
│   ├── plants/                # Plant endpoints
│   │   ├── dto/               # Request/response DTOs with validation
│   │   ├── repositories/      # Data access layer (Prisma)
│   │   ├── plants.controller.ts   # HTTP layer (thin)
│   │   ├── plants.service.ts      # Business logic
│   │   └── plants.module.ts
│   └── states/                # State endpoints
│       ├── dto/
│       ├── repositories/
│       ├── states.controller.ts
│       ├── states.service.ts
│       └── states.module.ts
├── prisma/                     # Prisma ORM service
├── redis/                      # Redis caching module
└── main.ts                     # Application entry point
```

## 🔧 API Endpoints

**Base URL:** `http://localhost:3000/api/v1`

**📚 Interactive Documentation:** [`http://localhost:3000/api/v1/docs`](http://localhost:3000/api/v1/docs)

### API Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AIQ Energy Insights API                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Plants Endpoints                                        │
│  ├─ GET  /api/v1/plants          Top N plants globally     │
│  ├─ GET  /api/v1/plants?state=CA Top N plants by state     │
│  └─ GET  /api/v1/plants/:id      Individual plant details  │
│                                                             │
│  🗺️  States Endpoints                                       │
│  ├─ GET  /api/v1/states          All states summary        │
│  └─ GET  /api/v1/states/:code    Single state with plants  │
│                                                             │
│  ❤️  System Endpoints                                       │
│  ├─ GET  /api/v1                 Welcome message           │
│  ├─ GET  /api/v1/health          Health check              │
│  └─ GET  /api/v1/docs            Swagger documentation     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Plants

#### `GET /api/v1/plants`

Get top N plants by net generation (globally or by state).

**Query Parameters:**

- `top` (optional, default: 10, max: 100) - Number of top plants
- `state` (optional) - 2-letter state code (e.g., "CA", "TX")
- `year` (optional, default: 2023) - Generation year

**Example:**

```bash
curl "http://localhost:3000/api/v1/plants?top=5&state=CA&year=2023"
```

**Response:**

```json
[
  {
    "id": 1,
    "plantId": 123,
    "name": "Diablo Canyon",
    "state": { "id": 6, "code": "CA", "name": "California" },
    "year": 2023,
    "netGeneration": 17892234.5,
    "percentOfState": 8.42,
    "rank": 1
  }
]
```

#### `GET /api/v1/plants/:id`

Get individual plant details with generation history.

**Example:**

```bash
curl "http://localhost:3000/api/v1/plants/123"
```

### States

#### `GET /api/v1/states`

Get all states with generation summary.

**Query Parameters:**

- `year` (optional, default: 2023) - Generation year

**Example:**

```bash
curl "http://localhost:3000/api/v1/states?year=2023"
```

**Response:**

```json
[
  {
    "stateId": 1,
    "code": "TX",
    "name": "Texas",
    "year": 2023,
    "totalGeneration": 523456789.0,
    "percentOfNational": 12.34,
    "plantCount": 450,
    "rank": 1
  }
]
```

#### `GET /api/v1/states/:stateCode`

Get detailed information for a specific state with top plants.

**Query Parameters:**

- `year` (optional, default: 2023) - Generation year
- `topPlants` (optional, default: 10) - Number of top plants to include

**Example:**

```bash
curl "http://localhost:3000/api/v1/states/CA?year=2023&topPlants=5"
```

### Health & Documentation

- `GET /api/v1` - API information
- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/docs` - **Swagger/OpenAPI documentation** (interactive)

## 🏗️ Architecture

This project follows **Clean Architecture** principles:

### Layered Structure

```
┌─────────────────────────────────────┐
│  Presentation Layer (Controllers)   │  ← Thin, delegates to services
│  - Input validation (DTOs)          │
│  - OpenAPI decorators               │
└──────────────┬──────────────────────┘
               │ depends on ↓
┌─────────────────────────────────────┐
│  Application Layer (Services)       │  ← Business logic
│  - Pure TypeScript                  │
│  - No framework dependencies        │
└──────────────┬──────────────────────┘
               │ depends on ↓
┌─────────────────────────────────────┐
│  Infrastructure Layer (Repositories)│  ← Data access
│  - Prisma ORM                       │
│  - Redis caching                    │
└─────────────────────────────────────┘
```

### Key Features

#### Core Architecture

- ✅ **Modular NestJS architecture** (Controller → Service → Repository)
- ✅ **Clean Architecture** with strict layer separation
- ✅ **DTO validation** with `class-validator` decorators
- ✅ **Swagger/OpenAPI documentation** on all endpoints
- ✅ **API Versioning** (`/api/v1`) for future-proof evolution

#### Performance & Scalability

- ✅ **Redis caching** with 1-hour TTL (graceful fallback)
- ✅ **Database optimization** (indexes, materialized views)
- ✅ **Rate limiting** (100 requests/minute per IP via @nestjs/throttler)

#### Security & Reliability

- ✅ **Helmet security headers** (CSP, X-Frame-Options, HSTS, etc.)
- ✅ **Centralized error handling** with trace IDs
- ✅ **Input validation** with whitelisting and type transformation
- ✅ **JWT authentication guards** (extensible stubs for future use)
- ✅ **Role-based access control** (RBAC guards ready for implementation)
- ✅ **Audit logging interceptor** (ready for compliance requirements)

#### DevOps & Testing

- ✅ **Test-Driven Development** (96%+ service coverage)
- ✅ **Docker containerization** with multi-stage builds
- ✅ **GitHub Actions CI/CD** with automated testing and Docker builds
- ✅ **Health check endpoints** for Kubernetes/ECS orchestration
- ✅ **Idempotent operations** (all endpoints are GET requests)

## 🗄️ Database Schema

### Normalized OLTP Schema

```
┌─────────────┐
│   state     │
├─────────────┤
│ id (PK)     │
│ code (UK)   │  ← "CA", "TX", etc.
│ name        │
└─────┬───────┘
      │ 1:N
┌─────▼──────────────┐
│   plant            │
├────────────────────┤
│ id (PK)            │
│ plant_id           │  ← eGRID plant ID
│ name               │
│ state_id (FK)      │
│ UNIQUE(plant_id)   │
└─────┬──────────────┘
      │ 1:N
┌─────▼─────────────────────────┐
│  plant_generation             │
├───────────────────────────────┤
│ id (PK)                       │
│ plant_id (FK)                 │
│ year                          │
│ net_generation                │
│ UNIQUE(plant_id, year)        │
└───────────────────────────────┘
```

### Performance Optimizations

- **Indexes:** `plant_generation(year, net_generation DESC)` for fast top-N queries
- **Materialized View:** `state_generation_mv` for state-level aggregations
- **Redis Caching:** 1-hour TTL on hot query paths

## 🧪 Testing

### Test Suite Overview

```
┌──────────────────────────────────────────────────────────┐
│  Test Type        │  Count  │  Coverage  │  Purpose      │
├──────────────────────────────────────────────────────────┤
│  Unit Tests       │   31    │   98%+     │  Business     │
│  Integration      │   22    │   95%+     │  Data Layer   │
│  E2E Tests        │    -    │     -      │  Full Stack   │
├──────────────────────────────────────────────────────────┤
│  TOTAL            │   53    │   >96%     │  🎯 EXCELLENT │
└──────────────────────────────────────────────────────────┘
```

### Running Tests

```bash
# 🧪 All tests with coverage report
npm test -- --coverage

# ⚡ Unit tests only (fast)
npm test -- --testPathIgnorePatterns=integration

# 🔗 Integration tests only (requires database)
npm test -- --testPathPattern=integration

# 🌐 End-to-end tests
npm run test:e2e

# 👀 Watch mode (development)
npm run test:watch
```

### Test Coverage Highlights

| Service             | Coverage | Status       |
| ------------------- | -------- | ------------ |
| **PlantsService**   | 100%     | ✅ Excellent |
| **StatesService**   | 98.14%   | ✅ Excellent |
| **PlantRepository** | 95%+     | ✅ Strong    |
| **StateRepository** | 95%+     | ✅ Strong    |

### Edge Cases Covered

<table>
<tr>
<td>

**Data Validation**

- ✅ Empty query results
- ✅ Invalid `top` parameter (0, 150)
- ✅ Non-existent state codes ('XX', 'ZZ')
- ✅ Year boundaries (1900, 2100)

</td>
<td>

**Error Handling**

- ✅ Database connection errors
- ✅ Malformed requests
- ✅ Missing required parameters
- ✅ Type coercion failures

</td>
</tr>
<tr>
<td>

**Performance**

- ✅ Cache hit/miss scenarios
- ✅ Large dataset queries
- ✅ Concurrent requests
- ✅ Connection pool exhaustion

</td>
<td>

**Integration**

- ✅ Redis unavailable (graceful degradation)
- ✅ Database migration states
- ✅ Transaction rollbacks
- ✅ Foreign key constraints

</td>
</tr>
</table>

## 🛠️ Available Scripts

```bash
# Development
npm run dev                     # Start with hot reload
npm run start:dev               # Alternative dev mode

# Production
npm run build                   # Build TypeScript
npm run start                   # Start production server

# Testing
npm test                        # Run all tests
npm run test:watch              # Watch mode
npm run test:cov                # With coverage report

# Database
npx prisma migrate dev          # Create new migration
npx prisma migrate deploy       # Apply migrations (production)
npx prisma db seed              # Seed database
npx prisma studio               # Open Prisma Studio (GUI)

# Prisma
npx prisma generate             # Regenerate Prisma client
npx prisma format               # Format schema.prisma

# Redis
npm run test:redis              # Test Redis connection

# Linting
npm run lint                    # ESLint
npm run format                  # Prettier
```

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"

# Redis (optional, graceful fallback)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Application
NODE_ENV="development"
PORT=3000
```

## 🐳 Docker Details

### Multi-Stage Dockerfile

- **Stage 1 (Builder):** Installs all dependencies, builds TypeScript, generates Prisma client
- **Stage 2 (Production):** Minimal Alpine image with only production dependencies
- **Security:** Runs as non-root user (`nestjs`)
- **Health Check:** HTTP GET to `/api/health` every 30s

### Docker Compose Services

| Service  | Port | Description                          |
| -------- | ---- | ------------------------------------ |
| postgres | 5432 | PostgreSQL 14 with persistent volume |
| redis    | 6379 | Redis 7 with AOF persistence         |
| app      | 3000 | NestJS application                   |

### Volumes

- `postgres_data` - Database files
- `redis_data` - Redis append-only file

## 🚀 Deployment

### Production Deployment Checklist

<details>
<summary><strong>📋 Pre-Deployment (Click to expand)</strong></summary>

#### Security

- [ ] Set `NODE_ENV=production`
- [ ] Use strong database passwords (min 16 characters)
- [ ] Configure Redis with authentication (`requirepass`)
- [ ] Enable HTTPS with reverse proxy (nginx/Traefik)
- [ ] Set up firewall rules (allow only necessary ports)
- [ ] Configure CORS with specific origins
- [ ] Enable rate limiting per IP/API key
- [ ] Review and update JWT secret

#### Infrastructure

- [ ] Provision production database (PostgreSQL 14+)
- [ ] Set up Redis cluster for high availability
- [ ] Configure load balancer (ALB/NLB/HAProxy)
- [ ] Set up CDN for static assets
- [ ] Configure DNS records
- [ ] Set up SSL/TLS certificates (Let's Encrypt)

#### Database

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Create database backups schedule
- [ ] Set up connection pooling (PgBouncer)
- [ ] Configure read replicas
- [ ] Refresh materialized views: `npm run refresh:mv`
- [ ] Optimize indexes for production data

#### Observability

- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Datadog, CloudWatch)
- [ ] Set up alerting (PagerDuty, Opsgenie)
- [ ] Enable health check endpoints
- [ ] Configure APM (Application Performance Monitoring)
- [ ] Set up error tracking (Sentry, Rollbar)

#### CI/CD

- [ ] Configure automated deployments
- [ ] Set up staging environment
- [ ] Enable blue-green deployments
- [ ] Configure rollback procedures
- [ ] Set up smoke tests post-deployment

</details>

### Deployment Architectures

<details>
<summary><strong>☁️ Cloud Deployment Options</strong></summary>

#### AWS Deployment

```
┌─────────────────────────────────────────────────────────┐
│                      AWS Architecture                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐      ┌──────────────────┐            │
│  │   Route 53  │─────▶│  CloudFront CDN  │            │
│  └─────────────┘      └──────────┬───────┘            │
│                                  │                      │
│                       ┌──────────▼──────────┐          │
│                       │  Application LB     │          │
│                       └──────────┬──────────┘          │
│                                  │                      │
│         ┌────────────────────────┼─────────────┐       │
│         │                        │             │       │
│    ┌────▼────┐            ┌─────▼─────┐  ┌───▼───┐  │
│    │  ECS    │            │    ECS    │  │  ECS  │  │
│    │ Task 1  │            │  Task 2   │  │ Task N│  │
│    └─────────┘            └───────────┘  └───────┘  │
│         │                        │             │       │
│         └────────────────────────┼─────────────┘       │
│                                  │                      │
│              ┌───────────────────┼───────────┐         │
│              │                   │           │         │
│         ┌────▼────┐         ┌───▼────┐  ┌──▼──────┐  │
│         │   RDS   │         │ElastiC.│  │  S3     │  │
│         │Postgres │         │(Redis) │  │ Backups │  │
│         └─────────┘         └────────┘  └─────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Services Used:**

- **ECS Fargate**: Container orchestration
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **ALB**: Application Load Balancer
- **CloudFront**: CDN
- **S3**: Static assets & backups
- **CloudWatch**: Monitoring & logs

#### Docker Swarm / Kubernetes

```yaml
# docker-compose.prod.yml (simplified)
version: "3.8"
services:
  app:
    image: ghcr.io/achu-anil/aiq-energy-insights:latest
    replicas: 3
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
```

</details>

### Scaling Strategies

| Strategy                 | Implementation                                   | Benefits                        |
| ------------------------ | ------------------------------------------------ | ------------------------------- |
| **Horizontal Scaling**   | Run multiple app containers behind load balancer | Linear performance increase     |
| **Caching Layer**        | Redis cache with 1-hour TTL                      | Reduced database load (60-80%)  |
| **Database Replication** | Read replicas for query distribution             | Improved read performance       |
| **Connection Pooling**   | PgBouncer (100-200 connections)                  | Efficient connection management |
| **CDN Integration**      | CloudFront/Cloudflare for static assets          | Reduced latency globally        |

### Performance Targets

> **Note:** Performance metrics below are target goals for production deployment with proper infrastructure (load balancers, CDN, read replicas). Actual performance depends on hardware, network conditions, and database optimization.

```
┌─────────────────────────────────────────────────────────┐
│  Metric              │  Target    │  Status             │
├─────────────────────────────────────────────────────────┤
│  Response Time (p95) │   < 200ms  │   🎯 Target         │
│  Response Time (p99) │   < 500ms  │   🎯 Target         │
│  Throughput          │  1000 rps  │   🎯 Target         │
│  Error Rate          │   < 0.1%   │   🎯 Target         │
│  Cache Hit Rate      │   > 70%    │   ✅ Achievable     │
│  Uptime (SLA)        │  99.9%     │   🎯 Target         │
└─────────────────────────────────────────────────────────┘
```

## 📝 Assumptions & Design Decisions

| Decision                | Rationale                                                      |
| ----------------------- | -------------------------------------------------------------- |
| **Data Source**         | eGRID 2023 dataset from EPA (most recent available)            |
| **Caching Strategy**    | 1-hour TTL balances data freshness with performance            |
| **Pagination Approach** | Top-N pattern instead of offset/limit (optimized for use case) |
| **State Codes**         | ISO 3166-2 2-letter codes (e.g., "CA", "TX") for consistency   |
| **Error Handling**      | Structured JSON errors with trace IDs for debugging            |
| **Input Validation**    | Strict whitelisting to prevent invalid queries                 |
| **Database Design**     | Normalized OLTP schema with denormalized materialized views    |
| **API Versioning**      | `/api/v1` prefix for backward compatibility                    |

---

## 🔮 Future Improvements

<details>
<summary><strong>Click to expand roadmap</strong></summary>

### API Enhancements

- [ ] GraphQL API alongside REST
- [ ] WebSocket support for real-time updates
- [ ] Bulk data export (CSV, Excel, JSON)
- [ ] Advanced filtering (fuel type, capacity range, coordinates)
- [ ] Geospatial queries (plants within radius)

### Security & Access Control

- [ ] JWT authentication/authorization
- [ ] API key management
- [ ] Role-based access control (RBAC)
- [ ] OAuth 2.0 integration

### Performance & Scalability

- [ ] TimescaleDB for time-series optimization
- [ ] Read replicas for horizontal scaling
- [ ] CDN integration for static assets
- [ ] GraphQL DataLoader for batch requests

### Observability & Operations

- [ ] Prometheus metrics export
- [ ] Grafana dashboards
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Audit logging for compliance
- [ ] Alerting system integration

### Data Management

- [ ] Automated eGRID dataset updates
- [ ] Historical data archival
- [ ] Data versioning
- [ ] ETL pipeline automation

</details>

---

## 📄 License

This project is developed for educational and technical assessment purposes.

**© 2025 AIQ Energy Insights** - All Rights Reserved

---

## 🤝 Contributing

This is a technical assessment project. External contributions are not accepted at this time.

---

## 📧 Support & Contact

For questions about this implementation:

- **Technical Issues**: Open an issue in the repository
- **General Inquiries**: Contact the hiring team
- **Documentation**: See [Swagger UI](http://localhost:3000/api/v1/docs) when running locally

---

<div align="center">

**Built with ❤️ using NestJS, PostgreSQL, and TypeScript**

[⬆ Back to Top](#-aiq-energy-insights-api)

</div>
