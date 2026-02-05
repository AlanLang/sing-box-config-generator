import { http } from "@/api/http";
import z from "zod/v3";

export const inboundCreateSchema = z.object({
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

export type InboundCreateDto = z.infer<typeof inboundCreateSchema>;

export function createInbound(inboundData: InboundCreateDto) {
  return http.post("inbound", {
    json: inboundData,
  });
}
