import { http } from "@/api/http";
import { shortNameSchema } from "@/lib/validation";
import { z } from "zod";

export const dnsCreateSchema = z.object({
  uuid: z.string(),
  name: shortNameSchema,
  json: z.string(),
});

export type DnsCreateDto = z.infer<typeof dnsCreateSchema>;

export function createDns(dnsData: DnsCreateDto) {
  return http.post("dns-server", {
    json: dnsData,
  });
}
