import { http } from "@/api/http";
import z from "zod/v3";

export const outboundCreateSchema = z.object({
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

export type OutboundCreateDto = z.infer<typeof outboundCreateSchema>;

export function createOutbound(outboundData: OutboundCreateDto) {
  return http.post("outbound", {
    json: outboundData,
  });
}
