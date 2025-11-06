/**
 * Audit Log Interceptor
 *
 * Logs all API requests and responses for audit trail and compliance.
 * Captures request metadata, response status, and execution time.
 *
 * Usage (future):
 * ```typescript
 * // Global application in main.ts
 * app.useGlobalInterceptors(new AuditLogInterceptor());
 *
 * // Or per-controller
 * @UseInterceptors(AuditLogInterceptor)
 * @Controller('plants')
 * export class PlantsController { ... }
 * ```
 *
 * TODO: Implement when audit logging is required
 * 1. Store logs in database (audit_logs table)
 * 2. Integrate with external logging service (Datadog, ELK, Splunk)
 * 3. Add data masking for sensitive fields (passwords, tokens)
 * 4. Configure retention policy (e.g., 90 days)
 * 5. Add filtering to exclude health checks and static assets
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";

/**
 * AuditLogInterceptor
 *
 * Intercepts HTTP requests to log audit trail information.
 * Logs are structured JSON for easy parsing and analysis.
 *
 * @future Audit log schema:
 * ```typescript
 * interface AuditLog {
 *   timestamp: string;         // ISO 8601 format
 *   traceId: string;           // Correlation ID
 *   userId?: string;           // From JWT token
 *   username?: string;         // From JWT token
 *   method: string;            // GET, POST, PUT, DELETE
 *   path: string;              // /api/v1/plants?top=10
 *   statusCode: number;        // 200, 404, 500
 *   executionTime: number;     // Milliseconds
 *   ip: string;                // Client IP address
 *   userAgent: string;         // Browser/client info
 *   error?: string;            // Error message if failed
 *   requestBody?: any;         // For POST/PUT (masked)
 *   responseBody?: any;        // For audit requirements (masked)
 * }
 * ```
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  /**
   * Intercepts request execution to log audit information
   *
   * @param context - Execution context with request details
   * @param next - Call handler for downstream execution
   * @returns Observable with response
   *
   * @future Implementation:
   * ```typescript
   * const request = context.switchToHttp().getRequest();
   * const response = context.switchToHttp().getResponse();
   * const startTime = Date.now();
   *
   * const auditLog = {
   *   timestamp: new Date().toISOString(),
   *   traceId: request.headers['x-trace-id'],
   *   userId: request.user?.id,
   *   username: request.user?.username,
   *   method: request.method,
   *   path: request.url,
   *   ip: request.ip,
   *   userAgent: request.headers['user-agent'],
   * };
   *
   * return next.handle().pipe(
   *   tap(() => {
   *     const executionTime = Date.now() - startTime;
   *     this.logger.log({
   *       ...auditLog,
   *       statusCode: response.statusCode,
   *       executionTime,
   *     });
   *     // Store in database or send to external service
   *   }),
   *   catchError((error) => {
   *     const executionTime = Date.now() - startTime;
   *     this.logger.error({
   *       ...auditLog,
   *       statusCode: error.status || 500,
   *       executionTime,
   *       error: error.message,
   *     });
   *     throw error;
   *   }),
   * );
   * ```
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // STUB: Basic logging implementation
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, ip } = request;
    const userAgent = request.get("user-agent") || "";

    // Log incoming request (basic info only)
    this.logger.log(
      `[AUDIT] ${method} ${url} - IP: ${
        ip.split(",")[0]
      } - Agent: ${userAgent.substring(0, 50)}`
    );

    return next.handle().pipe(
      tap(() => {
        // Log successful response
        const executionTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `[AUDIT] ${method} ${url} - ${statusCode} - ${executionTime}ms`
        );

        // Future: Store in database
        // await this.auditLogService.create({ ... });
      }),
      catchError((error) => {
        // Log error response
        const executionTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error(
          `[AUDIT] ${method} ${url} - ${statusCode} - ${executionTime}ms - Error: ${error.message}`
        );

        // Future: Store in database with error details
        // await this.auditLogService.create({ ... });

        throw error;
      })
    );
  }

  /**
   * Masks sensitive data in request/response bodies
   *
   * @private
   * @future Helper for data masking
   *
   * @example
   * ```typescript
   * const masked = this.maskSensitiveData({
   *   username: 'john',
   *   password: 'secret123',
   *   email: 'john@example.com',
   * });
   * // Result: { username: 'john', password: '***', email: 'j***@example.com' }
   * ```
   */
  private maskSensitiveData(data: any): any {
    // Future: Implement field masking
    // - password -> '***'
    // - ssn -> '***-**-1234'
    // - creditCard -> '****-****-****-1234'
    // - email -> 'j***@example.com'
    return data;
  }
}
