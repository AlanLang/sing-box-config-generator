import ky from "ky";
import { z } from "zod";
import type { OutboundGroupDto } from "./types";

export const outboundGroupCreateSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Name can only contain letters, numbers, - and _",
      ),
    group_type: z.enum(["selector", "urltest"]),
    outbounds: z.array(z.string()),
    url: z
      .union([z.string(), z.undefined()])
      .transform((val) => (val === "" || val === undefined ? undefined : val))
      .pipe(z.string().url().optional()),
    interval: z
      .union([z.string(), z.undefined()])
      .transform((val) => (val === "" || val === undefined ? undefined : val))
      .pipe(
        z
          .string()
          .regex(/^\d+[smh]$/, "Interval must be in format like 3m, 30s, 1h")
          .optional(),
      ),
    tolerance: z.number().min(0).max(10000).optional(),
    idle_timeout: z
      .union([z.string(), z.undefined()])
      .transform((val) => (val === "" || val === undefined ? undefined : val))
      .pipe(
        z
          .string()
          .regex(/^\d+[smh]$/, "Idle timeout must be in format like 30m, 1h")
          .optional(),
      ),
    interrupt_exist_connections: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Selector requires at least 1 outbound
    if (data.group_type === "selector" && data.outbounds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selector requires at least 1 outbound",
        path: ["outbounds"],
      });
    }

    // URLTest requires at least 2 outbounds
    if (data.group_type === "urltest" && data.outbounds.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URLTest requires at least 2 outbounds",
        path: ["outbounds"],
      });
    }
  });

export type OutboundGroupCreateInput = z.infer<
  typeof outboundGroupCreateSchema
>;

export async function createOutboundGroup(
  uuid: string,
  data: OutboundGroupCreateInput,
): Promise<OutboundGroupDto> {
  const payload: OutboundGroupDto = {
    uuid,
    ...data,
  };

  const response = await ky
    .post("/api/outbound-group", { json: payload })
    .json<OutboundGroupDto>();
  return response;
}
