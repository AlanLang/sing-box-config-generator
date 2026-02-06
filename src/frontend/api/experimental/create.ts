import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const experimentalCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type ExperimentalCreateDto = z.infer<typeof experimentalCreateSchema>;

export function createExperimental(experimentalData: ExperimentalCreateDto) {
  return http.post("experimental", {
    json: experimentalData,
  });
}
