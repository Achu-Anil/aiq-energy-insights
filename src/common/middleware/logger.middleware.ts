import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/**
 * HTTP Request Logger Middleware
 *
 * Logs all incoming HTTP requests with timing information and response status.
 * This middleware:
 * 1. Records the timestamp when a request starts
 * 2. Passes control to the next handler immediately (non-blocking)
 * 3. Listens for the 'finish' event on the response object
 * 4. Logs the full request details with duration when response is sent
 *
 * Log format: METHOD PATH - STATUS_CODE - DURATIONms
 * Example: GET /api/plants?top=10 - 200 - 42ms
 *
 * Usage:
 * Apply to all routes in app.module.ts:
 * ```
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(LoggerMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  /**
   * Execute middleware for each HTTP request
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Callback to pass control to next middleware/handler
   */
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    // Listen for the 'finish' event which fires when response is sent
    // This allows us to capture the response status code and duration
    res.on("finish", () => {
      const { statusCode } = res;
      const duration = Date.now() - start;

      // Use appropriate log level based on status code
      if (statusCode >= 500) {
        this.logger.error(
          `${method} ${originalUrl} - ${statusCode} - ${duration}ms`
        );
      } else if (statusCode >= 400) {
        this.logger.warn(
          `${method} ${originalUrl} - ${statusCode} - ${duration}ms`
        );
      } else {
        this.logger.log(
          `${method} ${originalUrl} - ${statusCode} - ${duration}ms`
        );
      }
    });

    // Pass control to the next middleware/handler
    next();
  }
}
