import { http } from "@/api/http";
import z from "zod/v3";

export const routeCreateSchema = z.object({
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

export type RouteCreateDto = z.infer<typeof routeCreateSchema>;

export function createRoute(routeData: RouteCreateDto) {
  return http.post("route", {
    json: routeData,
  });
}
