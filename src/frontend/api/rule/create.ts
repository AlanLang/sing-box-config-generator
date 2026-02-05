import { http } from "@/api/http";
import z from "zod/v3";

export const ruleCreateSchema = z.object({
  uuid: z.string(),
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must be less than 50 characters.",
    }),
  json: z.string(),
});

export type RuleCreateDto = z.infer<typeof ruleCreateSchema>;

export function createRule(ruleData: RuleCreateDto) {
  return http.post("rule", {
    json: ruleData,
  });
}
