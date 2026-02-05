import { http } from "@/api/http";
import z from "zod/v3";

export const dnsCreateSchema = z.object({
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

export type DnsCreateDto = z.infer<typeof dnsCreateSchema>;

export function createDns(dnsData: DnsCreateDto) {
  return http.post("dns", {
    json: dnsData,
  });
}
