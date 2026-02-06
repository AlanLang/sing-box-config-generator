import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const routeCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  json: z.string(),
});

export type RouteCreateDto = z.infer<typeof routeCreateSchema>;

export function createRoute(routeData: RouteCreateDto) {
  return http.post("route", {
    json: routeData,
  });
}
