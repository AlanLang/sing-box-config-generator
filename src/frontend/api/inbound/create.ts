import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const inboundCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type InboundCreateDto = z.infer<typeof inboundCreateSchema>;

export function createInbound(inboundData: InboundCreateDto) {
  return http.post("inbound", {
    json: inboundData,
  });
}
