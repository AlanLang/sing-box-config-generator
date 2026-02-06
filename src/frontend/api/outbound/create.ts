import { http } from "@/api/http";
import { shortNameSchema } from "@/lib/validation";
import { z } from "zod";

export const outboundCreateSchema = z.object({
  uuid: z.string(),
  name: shortNameSchema,
  json: z.string(),
});

export type OutboundCreateDto = z.infer<typeof outboundCreateSchema>;

export function createOutbound(outboundData: OutboundCreateDto) {
  return http.post("outbound", {
    json: outboundData,
  });
}
