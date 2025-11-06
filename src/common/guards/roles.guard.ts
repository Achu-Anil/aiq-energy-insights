/**
 * Roles Guard
 *
 * Enforces role-based access control (RBAC) on protected routes.
 * Works with @Roles() decorator and JwtAuthGuard.
 *
 * Usage (future):
 * ```typescript
 * @Roles('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Delete('plants/:id')
 * deletePlant() { ... }
 * ```
 *
 * TODO: Implement when RBAC is required
 * 1. Extract user roles from request.user (populated by JwtAuthGuard)
 * 2. Compare user roles with required roles from @Roles() decorator
 * 3. Allow access if user has at least one required role
 * 4. Reject with ForbiddenException if user lacks required roles
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * RolesGuard
 *
 * Validates user roles against required roles for a route.
 * Assumes request.user is populated by JwtAuthGuard.
 *
 * @future Expected request.user structure:
 * ```typescript
 * interface User {
 *   id: string;
 *   username: string;
 *   roles: string[]; // e.g., ['admin', 'user']
 * }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the user has required roles
   *
   * @param context - Execution context with route metadata and request
   * @returns true if authorized, throws ForbiddenException otherwise
   *
   * @future Implementation:
   * ```typescript
   * const requiredRoles = this.reflector.getAllAndOverride<string[]>(
   *   ROLES_KEY,
   *   [context.getHandler(), context.getClass()]
   * );
   *
   * if (!requiredRoles || requiredRoles.length === 0) {
   *   return true; // No roles required, allow access
   * }
   *
   * const request = context.switchToHttp().getRequest();
   * const user = request.user; // Set by JwtAuthGuard
   *
   * if (!user || !user.roles) {
   *   throw new ForbiddenException('User roles not found');
   * }
   *
   * const hasRole = requiredRoles.some(role =>
   *   user.roles.includes(role)
   * );
   *
   * if (!hasRole) {
   *   throw new ForbiddenException(
   *     `Requires one of: ${requiredRoles.join(', ')}`
   *   );
   * }
   *
   * return true;
   * ```
   */
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    // STUB: Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // STUB: Currently allows all requests
    // TODO: Implement role validation when authentication is enabled

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Would be set by JwtAuthGuard

    // Future: Check if user.roles contains any of requiredRoles
    if (user && user.roles) {
      const hasRole = requiredRoles.some((role: string) =>
        user.roles.includes(role)
      );

      if (!hasRole) {
        console.warn(
          `[RolesGuard] User lacks required roles: ${requiredRoles.join(", ")}`
        );
        // Future: throw new ForbiddenException(...)
      }
    }

    // STUB: Allow all requests until RBAC is implemented
    console.warn("[RolesGuard] RBAC not fully implemented - allowing request");
    return true;
  }
}
