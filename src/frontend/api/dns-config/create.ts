import { http } from "@/api/http";
import { shortNameSchema } from "@/lib/validation";
import { z } from "zod";

export const dnsConfigCreateSchema = z.object({
  uuid: z.string(),
  name: shortNameSchema,
  json: z.string(),
});

export type DnsConfigCreateDto = z.infer<typeof dnsConfigCreateSchema>;

export function createDnsConfig(dnsConfigData: DnsConfigCreateDto) {
  return http.post("dns-config", {
    json: dnsConfigData,
  });
}
