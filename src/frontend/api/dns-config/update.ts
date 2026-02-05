import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";
import z from "zod/v3";

export const dnsConfigUpdateSchema = z.object({
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

export type DnsConfigUpdateDto = z.infer<typeof dnsConfigUpdateSchema>;

export const useDnsConfigUpdate = () => {
  return useMutation({
    mutationFn: async (dnsConfigData: DnsConfigUpdateDto) => {
      return await http.put("dns-config", {
        json: dnsConfigData,
      });
    },
  });
};
