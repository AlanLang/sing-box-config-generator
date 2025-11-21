import { http } from "@/api/http";
import z from "zod/v3";

export const logCreateSchema = z.object({
  uuid: z.string(),
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(20, {
      message: "Name must be less than 20 characters.",
    }),
  json: z.string(),
});

export type LogCreateDto = z.infer<typeof logCreateSchema>;

export function createLog(logData: LogCreateDto) {
  return http.post("log", {
    json: logData,
  });
}
