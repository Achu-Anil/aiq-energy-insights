# Power Plant Generation API

A production-grade REST API for querying U.S. power plant net generation data from the eGRID 2021 dataset. Built with NestJS, PostgreSQL, Prisma ORM, and Redis caching.

## 🚀 Quick Start with Docker

**The fastest way to run the full stack:**

```bash
# Start all services (PostgreSQL, Redis, NestJS app)
docker-compose up --build

# The API will be available at http://localhost:3000/api/v1
# Swagger docs at http://localhost:3000/api/v1/docs
```

This will:

- ✅ Start PostgreSQL database
- ✅ Start Redis cache
- ✅ Run database migrations
- ✅ Seed initial data (year 2023)
- ✅ Start the NestJS application

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
    "state": { "code": "CA", "name": "California" },
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

### Run All Tests

```bash
# Unit tests only
npm test -- --testPathIgnorePatterns=integration

# Integration tests only
npm test -- --testPathPattern=integration

# All tests with coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

### Test Coverage

- **53 tests** (31 unit + 22 integration)
- **96.96%** coverage on PlantsService
- **97.14%** coverage on StatesService

### Edge Cases Tested

- ✅ No plants found for query
- ✅ Invalid `top` parameter (0, 150)
- ✅ Non-existent state codes ('XX', 'ZZ')
- ✅ Empty generation results
- ✅ Database connection errors
- ✅ Year boundaries (1900, 2100)

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

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong database passwords
- [ ] Configure Redis with authentication
- [ ] Enable HTTPS with reverse proxy (nginx)
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, Datadog)
- [ ] Set up alerting (PagerDuty, Opsgenie)
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Refresh materialized views: `npm run refresh:mv`

### Scaling

- **Horizontal:** Run multiple `app` containers behind a load balancer
- **Caching:** Redis cache reduces database load significantly
- **Database:** Use read replicas for query distribution

## 📝 Assumptions & Design Decisions

1. **Data Source:** eGRID 2021 dataset (year 2023 used for seeding)
2. **Caching:** 1-hour TTL balances freshness with performance
3. **Pagination:** Top-N pattern instead of offset/limit (more performant)
4. **State Codes:** ISO 3166-2 2-letter codes (e.g., "CA", "TX")
5. **Error Handling:** Structured JSON errors with trace IDs for debugging
6. **Validation:** Strict input validation to prevent invalid queries

## 🔮 Future Improvements

- [ ] GraphQL API alongside REST
- [ ] Authentication/Authorization (JWT)
- [ ] Rate limiting per API key
- [ ] Audit logging for compliance
- [ ] Time-series data with TimescaleDB
- [ ] Real-time updates via WebSockets
- [ ] Data export (CSV, Excel)
- [ ] Advanced filtering (fuel type, capacity range)
- [ ] Geospatial queries (plants near coordinates)

## � License

This project is for educational/interview purposes.

## 🤝 Contributing

This is a technical assessment project. Contributions are not accepted.

## 📧 Contact

For questions about this implementation, please reach out to the hiring team.
