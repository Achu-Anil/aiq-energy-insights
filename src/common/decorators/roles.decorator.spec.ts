/**
 * Unit Tests for Roles Decorator
 *
 * Tests the @Roles() decorator functionality.
 * Verifies metadata is correctly attached to route handlers.
 */

import { SetMetadata } from "@nestjs/common";
import { Roles, ROLES_KEY } from "./roles.decorator";

// Mock SetMetadata
jest.mock("@nestjs/common", () => ({
  SetMetadata: jest.fn((key, value) => {
    // Return a decorator function that stores metadata
    return (
      target: any,
      propertyKey?: string,
      descriptor?: PropertyDescriptor
    ) => {
      if (!target.__metadata__) {
        target.__metadata__ = {};
      }
      target.__metadata__[key] = value;
      return descriptor || target;
    };
  }),
}));

describe("Roles Decorator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ROLES_KEY constant", () => {
    it("should export ROLES_KEY constant", () => {
      expect(ROLES_KEY).toBeDefined();
      expect(ROLES_KEY).toBe("roles");
    });
  });

  describe("Roles decorator", () => {
    it("should call SetMetadata with ROLES_KEY and roles", () => {
      const roles = ["admin", "user"];

      Roles(...roles);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it("should handle single role", () => {
      const role = "admin";

      Roles(role);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [role]);
    });

    it("should handle multiple roles", () => {
      const roles = ["admin", "moderator", "user"];

      Roles(...roles);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it("should handle empty roles array", () => {
      Roles();

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, []);
    });

    it("should handle special characters in role names", () => {
      const roles = ["super-admin", "admin:write", "user.read"];

      Roles(...roles);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it("should handle numeric-like role names", () => {
      const roles = ["role1", "role2", "role3"];

      Roles(...roles);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it("should handle duplicate role names", () => {
      const roles = ["admin", "admin", "user"];

      Roles(...roles);

      // Should preserve duplicates (guard handles deduplication if needed)
      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it("should handle very long role names", () => {
      const longRole = "a".repeat(100);

      Roles(longRole);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [longRole]);
    });

    it("should handle many roles", () => {
      const manyRoles = Array.from({ length: 50 }, (_, i) => `role${i}`);

      Roles(...manyRoles);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, manyRoles);
    });
  });

  describe("decorator behavior", () => {
    it("should be usable as a method decorator", () => {
      class TestController {
        @Roles("admin")
        testMethod() {}
      }

      // Verify decorator was applied
      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, ["admin"]);
    });

    it("should preserve role order", () => {
      const roles = ["role3", "role1", "role2"];

      Roles(...roles);

      const calls = (SetMetadata as jest.Mock).mock.calls;
      expect(calls[calls.length - 1][1]).toEqual(roles);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined as role", () => {
      // TypeScript would prevent this, but test runtime behavior
      Roles(undefined as any);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [undefined]);
    });

    it("should handle null as role", () => {
      // TypeScript would prevent this, but test runtime behavior
      Roles(null as any);

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [null]);
    });

    it("should handle empty string as role", () => {
      Roles("");

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, [""]);
    });

    it("should handle whitespace-only role", () => {
      Roles("   ");

      expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, ["   "]);
    });
  });

  describe("multiple invocations", () => {
    it("should create separate metadata for each invocation", () => {
      (SetMetadata as jest.Mock).mockClear();

      Roles("admin");
      Roles("user");
      Roles("moderator");

      expect(SetMetadata).toHaveBeenCalledTimes(3);
      expect(SetMetadata).toHaveBeenNthCalledWith(1, ROLES_KEY, ["admin"]);
      expect(SetMetadata).toHaveBeenNthCalledWith(2, ROLES_KEY, ["user"]);
      expect(SetMetadata).toHaveBeenNthCalledWith(3, ROLES_KEY, ["moderator"]);
    });
  });
});
