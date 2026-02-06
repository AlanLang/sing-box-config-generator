import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const rulesetCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type RulesetCreateDto = z.infer<typeof rulesetCreateSchema>;

export function createRuleset(rulesetData: RulesetCreateDto) {
  return http.post("ruleset", {
    json: rulesetData,
  });
}
