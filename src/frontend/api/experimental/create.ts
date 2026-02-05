import { http } from "@/api/http";
import z from "zod/v3";

export const experimentalCreateSchema = z.object({
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

export type ExperimentalCreateDto = z.infer<typeof experimentalCreateSchema>;

export function createExperimental(experimentalData: ExperimentalCreateDto) {
  return http.post("experimental", {
    json: experimentalData,
  });
}
