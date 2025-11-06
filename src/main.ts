/**
 * Application Bootstrap
 *
 * Main entry point for the NestJS application.
 * Configures:
 * - Global middleware (CORS, validation, error handling)
 * - OpenAPI/Swagger documentation
 * - Application prefix and port
 *
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins (default: *)
 *
 * Endpoints:
 * - http://localhost:3000/api - API base
 * - http://localhost:3000/api/docs - Swagger UI documentation
 */

import "dotenv/config"; // Load .env file into process.env
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from "./common/filters/http-exception.filter";

/**
 * Bootstrap the NestJS application
 *
 * Sets up middleware, validation, error handling, and documentation.
 * This function is called once when the application starts.
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // ===========================
  // Security Middleware (Helmet)
  // ===========================
  // helmet() sets various HTTP headers to protect against common vulnerabilities:
  // - Content-Security-Policy: Prevents XSS attacks
  // - X-Frame-Options: Prevents clickjacking
  // - Strict-Transport-Security: Enforces HTTPS
  // - X-Content-Type-Options: Prevents MIME sniffing
  // - X-DNS-Prefetch-Control: Controls DNS prefetching
  // - Referrer-Policy: Controls referrer information
  app.use(
    helmet(
      process.env.NODE_ENV === "production"
        ? {} // Use default security settings in production
        : {
            // Allow Swagger UI to load properly in development
            contentSecurityPolicy: false,
          }
    )
  );

  // ===========================
  // CORS Configuration
  // ===========================
  // Enable Cross-Origin Resource Sharing for frontend applications
  // In production, set ALLOWED_ORIGINS to specific domains
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true, // Allow cookies and authorization headers
  });

  // ===========================
  // Global Route Prefix with Versioning
  // ===========================
  // All routes will be prefixed with /api/v1
  // Example: GET /plants becomes GET /api/v1/plants
  // This allows for future API versions (v2, v3) without breaking changes
  app.setGlobalPrefix("api/v1");

  // ===========================
  // Global Validation Pipeline
  // ===========================
  // Automatically validates all incoming requests against DTO classes
  // Features:
  // - whitelist: Strip properties not defined in DTO (security)
  // - forbidNonWhitelisted: Throw error if unknown properties sent
  // - transform: Auto-convert types (e.g., "123" string -> 123 number)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert primitive types
      },
    })
  );

  // ===========================
  // Global Exception Filters
  // ===========================
  // Centralized error handling for consistent error responses
  // - HttpExceptionFilter: Handles NestJS HTTP exceptions
  // - AllExceptionsFilter: Catches unexpected errors (fallback)
  app.useGlobalFilters(new HttpExceptionFilter(), new AllExceptionsFilter());

  // ===========================
  // OpenAPI/Swagger Documentation
  // ===========================
  // Auto-generated interactive API documentation
  // Access at: http://localhost:{PORT}/api/docs
  const config = new DocumentBuilder()
    .setTitle("Power Plant Generation API")
    .setDescription(
      "REST API for querying US power plant generation data from eGRID 2023 dataset. " +
        "Provides endpoints to fetch top plants by generation and state-level statistics."
    )
    .setVersion("1.0")
    .addTag("System", "Health checks and system information")
    .addTag("Plants", "Power plant generation endpoints")
    .addTag("States", "State-level generation summary endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/v1/docs", app, document);

  // ===========================
  // Start Server
  // ===========================
  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Log startup information
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/v1/docs`);
}

// Start the application
bootstrap();
