# AIQ Backend Challenge

A NestJS backend API project for the AIQ coding challenge.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

### Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm run start
```

The API will be available at `http://localhost:3000/api`

## 📁 Project Structure

```
src/
├── common/                 # Shared utilities and common code
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Guards for authentication/authorization
│   ├── interceptors/      # Request/response interceptors
│   ├── middleware/        # Custom middleware
│   └── pipes/             # Validation and transformation pipes
├── config/                # Configuration files
├── modules/               # Feature modules
│   └── users/             # Example users module
│       ├── dto/           # Data Transfer Objects
│       ├── entities/      # Entity definitions
│       ├── users.controller.ts
│       ├── users.service.ts
│       └── users.module.ts
├── app.controller.ts      # Root controller
├── app.module.ts          # Root module
├── app.service.ts         # Root service
└── main.ts                # Application entry point
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run start:dev` - Start development server with ts-node
- `npm test` - Run tests

## 📚 API Endpoints

### Health Check

- `GET /api` - Welcome message
- `GET /api/health` - Health check endpoint

### Users (Example Module)

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🏗️ Architecture

This project follows NestJS best practices with:

- **Modular architecture** - Each feature is organized into modules
- **Dependency injection** - Services are injected where needed
- **Exception handling** - Global exception filters for consistent error responses
- **Validation** - Input validation using pipes
- **Configuration management** - Environment-based configuration
- **Logging** - Request logging middleware

## 🔧 Development

### Adding a New Module

1. Create a new directory in `src/modules/`
2. Generate controller, service, and module files
3. Define DTOs and entities
4. Import the module in `app.module.ts`

### Environment Variables

Copy `.env.example` to `.env` and update the values:

- `PORT` - Server port (default: 3000)
- `DB_*` - Database configuration
- `JWT_*` - JWT token configuration

## 📝 License

This project is for educational/interview purposes.
