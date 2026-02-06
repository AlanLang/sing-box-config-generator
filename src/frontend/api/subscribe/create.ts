import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const subscribeCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type SubscribeCreateDto = z.infer<typeof subscribeCreateSchema>;

export function createSubscribe(subscribeData: SubscribeCreateDto) {
  return http.post("subscribe", {
    json: subscribeData,
  });
}
