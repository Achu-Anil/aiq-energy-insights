/**
 * JWT Authentication Guard
 *
 * This guard validates JWT tokens for protected routes.
 * Currently a stub for future implementation.
 *
 * Usage (future):
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource() { ... }
 * ```
 *
 * TODO: Implement when authentication is required
 * 1. Install @nestjs/jwt and @nestjs/passport
 * 2. Create AuthModule with JWT strategy
 * 3. Implement validate() method to verify token
 * 4. Extract user from token and attach to request
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Observable } from "rxjs";

/**
 * JwtAuthGuard
 *
 * Validates JWT tokens from Authorization header.
 * Rejects requests with invalid or missing tokens.
 *
 * @future Implementation plan:
 * - Extract token from 'Authorization: Bearer <token>' header
 * - Verify token signature using JWT_SECRET from config
 * - Decode token payload and attach user to request.user
 * - Check token expiration
 * - Handle refresh tokens (optional)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Determines if the request is authorized
   *
   * @param context - Execution context containing request details
   * @returns true if authorized, throws UnauthorizedException otherwise
   *
   * @future Implementation:
   * ```typescript
   * const request = context.switchToHttp().getRequest();
   * const token = this.extractTokenFromHeader(request);
   *
   * if (!token) {
   *   throw new UnauthorizedException('Missing authentication token');
   * }
   *
   * try {
   *   const payload = await this.jwtService.verifyAsync(token, {
   *     secret: this.configService.get('jwt.secret'),
   *   });
   *   request.user = payload; // Attach user to request
   *   return true;
   * } catch (error) {
   *   throw new UnauthorizedException('Invalid or expired token');
   * }
   * ```
   */
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    // STUB: Currently allows all requests
    // TODO: Implement JWT validation logic when authentication is needed

    const request = context.switchToHttp().getRequest();

    // Example: Check for Authorization header (not enforced yet)
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Future: Validate JWT token here
      console.warn(
        "[JwtAuthGuard] JWT validation not implemented - allowing request"
      );
    }

    // STUB: Allow all requests until authentication is implemented
    return true;
  }

  /**
   * Extract JWT token from Authorization header
   *
   * @private
   * @future Helper method for token extraction
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
