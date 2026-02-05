import { http } from "@/api/http";
import z from "zod/v3";

export const subscribeCreateSchema = z.object({
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

export type SubscribeCreateDto = z.infer<typeof subscribeCreateSchema>;

export function createSubscribe(subscribeData: SubscribeCreateDto) {
  return http.post("subscribe", {
    json: subscribeData,
  });
}
