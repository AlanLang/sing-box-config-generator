import { describe, expect, test } from "bun:test";
import { outboundGroupCreateSchema } from "./create";
import type { OutboundGroupCreateInput } from "./create";

describe("outboundGroupCreateSchema", () => {
  describe("Selector type validation", () => {
    test("should validate selector with UUID array", () => {
      const data: OutboundGroupCreateInput = {
        name: "test-selector",
        group_type: "selector",
        outbounds: [
          "fc4a8459-d638-4fbd-bb50-bcb7d54bb499", // UUID
          "b2d22d81-8079-4c35-acff-311485eecb06", // UUID
        ],
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      console.log("Validation result:", result);
      if (!result.success) {
        console.log("Validation errors:", result.error.issues);
      }

      expect(result.success).toBe(true);
    });

    test("should fail when selector has no outbounds", () => {
      const data = {
        name: "test-selector",
        group_type: "selector",
        outbounds: [],
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses .issues instead of .errors
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].message).toBe(
          "Selector requires at least 1 outbound",
        );
      }
    });

    test("should fail when default is not in outbounds", () => {
      const data = {
        name: "test-selector",
        group_type: "selector",
        outbounds: ["uuid-1", "uuid-2"],
        default: "uuid-3", // Not in outbounds array
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses .issues instead of .errors
        expect(result.error.issues[0].message).toBe(
          "Default must be one of selected outbounds",
        );
      }
    });

    test("should accept undefined optional fields", () => {
      const data = {
        name: "test-selector",
        group_type: "selector",
        outbounds: ["uuid-1"],
        default: undefined,
        url: undefined,
        interval: undefined,
        tolerance: undefined,
        idle_timeout: undefined,
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      console.log("Undefined fields result:", result);
      if (!result.success) {
        console.log("Errors:", result.error.issues);
      }

      expect(result.success).toBe(true);
    });
  });

  describe("URLTest type validation", () => {
    test("should validate urltest with 2+ UUIDs", () => {
      const data: OutboundGroupCreateInput = {
        name: "test-urltest",
        group_type: "urltest",
        outbounds: [
          "fc4a8459-d638-4fbd-bb50-bcb7d54bb499",
          "b2d22d81-8079-4c35-acff-311485eecb06",
        ],
        url: "https://www.gstatic.com/generate_204",
        interval: "3m",
        tolerance: 50,
        idle_timeout: "30m",
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      console.log("URLTest validation result:", result);
      if (!result.success) {
        console.log("Validation errors:", result.error.issues);
      }

      expect(result.success).toBe(true);
    });

    test("should fail when urltest has less than 2 outbounds", () => {
      const data = {
        name: "test-urltest",
        group_type: "urltest",
        outbounds: ["uuid-1"], // Only 1
        url: "https://www.gstatic.com/generate_204",
        interval: "3m",
        tolerance: 50,
        idle_timeout: "30m",
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses .issues instead of .errors
        expect(result.error.issues[0].message).toBe(
          "URLTest requires at least 2 outbounds",
        );
      }
    });

    test("should accept optional urltest fields as undefined", () => {
      const data = {
        name: "test-urltest",
        group_type: "urltest",
        outbounds: ["uuid-1", "uuid-2"],
        url: undefined,
        interval: undefined,
        tolerance: undefined,
        idle_timeout: undefined,
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);

      console.log("URLTest with undefined fields:", result);
      if (!result.success) {
        console.log("Errors:", result.error.issues);
      }

      expect(result.success).toBe(true);
    });
  });

  describe("Name validation", () => {
    test("should accept valid name with alphanumeric and dash", () => {
      const data = {
        name: "test-group-123",
        group_type: "selector",
        outbounds: ["uuid-1"],
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should fail when name is too short", () => {
      const data = {
        name: "a",
        group_type: "selector",
        outbounds: ["uuid-1"],
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should fail when name contains invalid characters", () => {
      const data = {
        name: "test group!", // Space and exclamation mark
        group_type: "selector",
        outbounds: ["uuid-1"],
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("Field format validation", () => {
    test("should validate interval format", () => {
      const validIntervals = ["3m", "30s", "1h", "10m"];

      for (const interval of validIntervals) {
        const data = {
          name: "test",
          group_type: "urltest",
          outbounds: ["uuid-1", "uuid-2"],
          interval,
          interrupt_exist_connections: false,
        };

        const result = outboundGroupCreateSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    test("should fail with invalid interval format", () => {
      const data = {
        name: "test",
        group_type: "urltest",
        outbounds: ["uuid-1", "uuid-2"],
        interval: "3minutes", // Invalid format
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should validate URL format", () => {
      const data = {
        name: "test",
        group_type: "urltest",
        outbounds: ["uuid-1", "uuid-2"],
        url: "https://www.gstatic.com/generate_204",
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should fail with invalid URL format", () => {
      const data = {
        name: "test",
        group_type: "urltest",
        outbounds: ["uuid-1", "uuid-2"],
        url: "not-a-url",
        interrupt_exist_connections: false,
      };

      const result = outboundGroupCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
