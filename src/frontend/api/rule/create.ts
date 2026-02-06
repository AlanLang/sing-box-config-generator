import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const ruleCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type RuleCreateDto = z.infer<typeof ruleCreateSchema>;

export function createRule(ruleData: RuleCreateDto) {
  return http.post("rule", {
    json: ruleData,
  });
}
