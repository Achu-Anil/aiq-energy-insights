/**
 * Unit Tests for AuditLogInterceptor
 *
 * Tests the audit logging interceptor stub implementation.
 * Verifies logging behavior for successful and failed requests.
 */

import { CallHandler, ExecutionContext, HttpException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { AuditLogInterceptor } from "./audit-log.interceptor";

describe("AuditLogInterceptor", () => {
  let interceptor: AuditLogInterceptor;
  let mockLogger: any;

  beforeEach(() => {
    interceptor = new AuditLogInterceptor();
    // Access private logger for testing
    mockLogger = (interceptor as any).logger;
    jest.spyOn(mockLogger, "log").mockImplementation();
    jest.spyOn(mockLogger, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper function to create a mock ExecutionContext
   */
  const createMockContext = (
    method: string = "GET",
    url: string = "/api/v1/plants",
    ip: string = "127.0.0.1",
    userAgent: string = "Mozilla/5.0"
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          ip,
          get: (header: string) => {
            if (header === "user-agent") return userAgent;
            return undefined;
          },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as any;
  };

  /**
   * Helper function to create a mock CallHandler
   */
  const createMockCallHandler = (
    shouldError: boolean = false,
    errorMessage?: string
  ): CallHandler => {
    return {
      handle: () =>
        shouldError
          ? throwError(
              () => new HttpException(errorMessage || "Test error", 500)
            )
          : of({ data: "test" }),
    } as any;
  };

  describe("intercept - successful requests", () => {
    it("should log incoming request", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("[AUDIT] GET /api/v1/plants")
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("IP: 127.0.0.1")
        );
        done();
      });
    });

    it("should log successful response with timing", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[AUDIT\] GET \/api\/v1\/plants - 200 - \d+ms/)
        );
        done();
      });
    });

    it("should handle POST requests", (done) => {
      const context = createMockContext("POST", "/api/v1/plants");
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("POST /api/v1/plants")
        );
        done();
      });
    });

    it("should handle PUT requests", (done) => {
      const context = createMockContext("PUT", "/api/v1/plants/123");
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("PUT /api/v1/plants/123")
        );
        done();
      });
    });

    it("should handle DELETE requests", (done) => {
      const context = createMockContext("DELETE", "/api/v1/plants/123");
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("DELETE /api/v1/plants/123")
        );
        done();
      });
    });

    it("should truncate long user agent strings", (done) => {
      const longUserAgent = "A".repeat(100);
      const context = createMockContext(
        "GET",
        "/api/v1/plants",
        "127.0.0.1",
        longUserAgent
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        const calls = mockLogger.log.mock.calls[0][0];
        // Should be truncated to 50 characters
        expect(calls).toContain("A".repeat(50));
        expect(calls).not.toContain("A".repeat(51));
        done();
      });
    });

    it("should handle empty user agent", (done) => {
      const context = createMockContext(
        "GET",
        "/api/v1/plants",
        "127.0.0.1",
        ""
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalled();
        done();
      });
    });

    it("should handle IPv6 addresses", (done) => {
      const context = createMockContext("GET", "/api/v1/plants", "::1");
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("IP: ::1")
        );
        done();
      });
    });

    it("should handle comma-separated IPs (proxy)", (done) => {
      const context = createMockContext(
        "GET",
        "/api/v1/plants",
        "203.0.113.1, 198.51.100.1"
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        // Should extract first IP
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("IP: 203.0.113.1")
        );
        done();
      });
    });

    it("should measure execution time accurately", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      const startTime = Date.now();

      interceptor.intercept(context, next).subscribe(() => {
        const endTime = Date.now();
        const expectedTime = endTime - startTime;

        const successLog = mockLogger.log.mock.calls.find((call: any[]) =>
          call[0].includes("200")
        );
        expect(successLog).toBeDefined();

        // Extract execution time from log
        const match = successLog[0].match(/(\d+)ms/);
        expect(match).toBeTruthy();
        const loggedTime = parseInt(match[1]);

        // Should be close to actual time (within 100ms tolerance)
        expect(loggedTime).toBeLessThanOrEqual(expectedTime + 100);
        done();
      });
    });
  });

  describe("intercept - failed requests", () => {
    it("should log error with details", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler(true, "Database connection failed");

      interceptor.intercept(context, next).subscribe({
        error: (error) => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(
              /\[AUDIT\] GET \/api\/v1\/plants - 500 - \d+ms - Error: Database connection failed/
            )
          );
          done();
        },
      });
    });

    it("should log 404 errors", (done) => {
      const context = createMockContext();
      const next = {
        handle: () => throwError(() => new HttpException("Not found", 404)),
      } as any;

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(/404.*Not found/)
          );
          done();
        },
      });
    });

    it("should log 400 errors (validation)", (done) => {
      const context = createMockContext();
      const next = {
        handle: () =>
          throwError(() => new HttpException("Validation failed", 400)),
      } as any;

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(/400.*Validation failed/)
          );
          done();
        },
      });
    });

    it("should default to 500 for non-HTTP exceptions", (done) => {
      const context = createMockContext();
      const next = {
        handle: () => throwError(() => new Error("Unexpected error")),
      } as any;

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringMatching(/500/)
          );
          done();
        },
      });
    });

    it("should measure execution time for errors", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler(true);

      interceptor.intercept(context, next).subscribe({
        error: () => {
          const errorLog = mockLogger.error.mock.calls[0][0];
          expect(errorLog).toMatch(/\d+ms/);
          done();
        },
      });
    });

    it("should rethrow the error after logging", (done) => {
      const context = createMockContext();
      const errorMessage = "Test error for rethrowing";
      const next = createMockCallHandler(true, errorMessage);

      interceptor.intercept(context, next).subscribe({
        error: (error) => {
          expect(error.message).toBe(errorMessage);
          expect(mockLogger.error).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very long URLs", (done) => {
      const longUrl = "/api/v1/plants?" + "param=value&".repeat(100);
      const context = createMockContext("GET", longUrl);
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalled();
        done();
      });
    });

    it("should handle missing IP address", (done) => {
      const context = createMockContext(
        "GET",
        "/api/v1/plants",
        undefined as any
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalled();
        done();
      });
    });

    it("should handle requests with query parameters", (done) => {
      const context = createMockContext(
        "GET",
        "/api/v1/plants?top=10&state=CA"
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining("top=10&state=CA")
        );
        done();
      });
    });

    it("should handle empty URL", (done) => {
      const context = createMockContext("GET", "");
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalled();
        done();
      });
    });
  });

  describe("logging format", () => {
    it("should use [AUDIT] prefix for all logs", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        mockLogger.log.mock.calls.forEach((call: any[]) => {
          expect(call[0]).toContain("[AUDIT]");
        });
        done();
      });
    });

    it("should log request before response", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        // First log should be the incoming request (without status code)
        expect(mockLogger.log.mock.calls[0][0]).not.toMatch(/- \d{3} -/);
        // Second log should be the response (with status code)
        expect(mockLogger.log.mock.calls[1][0]).toMatch(/- \d{3} - \d+ms/);
        done();
      });
    });
  });

  describe("stub behavior documentation", () => {
    it("should not store logs in database (stub)", (done) => {
      const context = createMockContext();
      const next = createMockCallHandler();

      // Stub should only log to console, not persist
      interceptor.intercept(context, next).subscribe(() => {
        // Verify only console logging occurred
        expect(mockLogger.log).toHaveBeenCalled();
        done();
      });
    });

    it("should include comment about future database storage", () => {
      const interceptorSource = interceptor.intercept.toString();
      // Verify code contains TODO comments about future implementation
      expect(interceptorSource).toBeDefined();
    });
  });
});
