import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";

/**
 * HTTP Exception Filter
 * Catches all HttpException instances and formats them consistently
 * Provides detailed error messages and trace IDs for debugging
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Extract trace ID from request headers or generate new one
    const traceId = (request.headers["x-trace-id"] as string) || randomUUID();

    // Get exception response (may be string or object)
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === "object" && "message" in exceptionResponse
        ? (exceptionResponse as any).message
        : exception.message;

    const errorResponse = {
      statusCode: status,
      error: HttpStatus[status] || "Error",
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
    };

    // Log error with context
    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} - ${status}`,
        exception.stack
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${traceId}] ${request.method} ${
          request.url
        } - ${status}: ${JSON.stringify(message)}`
      );
    }

    response.status(status).json(errorResponse);
  }
}

/**
 * All Exceptions Filter
 * Catches all unhandled exceptions (fallback)
 * Ensures consistent error response format even for unexpected errors
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = (request.headers["x-trace-id"] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === "object" && "message" in exceptionResponse
          ? (exceptionResponse as any).message
          : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      error: HttpStatus[status] || "Error",
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      traceId,
    };

    // Always log unexpected errors
    this.logger.error(
      `[${traceId}] ${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    response.status(status).json(errorResponse);
  }
}
