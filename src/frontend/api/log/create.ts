import { http } from "@/api/http";
import { shortNameSchema } from "@/lib/validation";
import { z } from "zod";

export const logCreateSchema = z.object({
  uuid: z.string(),
  name: shortNameSchema,
  json: z.string(),
});

export type LogCreateDto = z.infer<typeof logCreateSchema>;

export function createLog(logData: LogCreateDto) {
  return http.post("log", {
    json: logData,
  });
}
