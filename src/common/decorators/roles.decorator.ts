/**
 * Roles Decorator
 *
 * Custom decorator to specify required roles for route access.
 * Used in conjunction with RolesGuard for role-based access control (RBAC).
 *
 * Usage (future):
 * ```typescript
 * @Roles('admin', 'moderator')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Delete('plants/:id')
 * deletePlant() { ... }
 * ```
 *
 * This decorator attaches metadata to the route handler,
 * which RolesGuard reads to determine authorization.
 */

import { SetMetadata } from "@nestjs/common";

/**
 * Metadata key for storing required roles
 * Used by RolesGuard to check user permissions
 */
export const ROLES_KEY = "roles";

/**
 * Roles decorator
 *
 * Marks a route as requiring specific roles for access.
 * Combines with RolesGuard to enforce role-based authorization.
 *
 * @param roles - Array of role names (e.g., 'admin', 'user', 'moderator')
 * @returns MethodDecorator that attaches role metadata
 *
 * @example
 * ```typescript
 * // Only admins can access this endpoint
 * @Roles('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) { ... }
 *
 * // Multiple roles allowed
 * @Roles('admin', 'moderator')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Put('posts/:id/approve')
 * approvePost(@Param('id') id: string) { ... }
 * ```
 *
 * @future Implementation notes:
 * - User roles should come from JWT token payload
 * - Roles can be hierarchical (admin > moderator > user)
 * - Consider using enums for role names:
 *   ```typescript
 *   enum Role {
 *     Admin = 'admin',
 *     Moderator = 'moderator',
 *     User = 'user',
 *   }
 *   @Roles(Role.Admin)
 *   ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
