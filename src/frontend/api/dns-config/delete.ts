import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface DnsConfigDeleteDto {
  uuid: string;
}

export const useDnsConfigDelete = () => {
  return useMutation({
    mutationFn: async (dnsConfigData: DnsConfigDeleteDto) => {
      return await http.delete("dns-config", {
        searchParams: {
          uuid: dnsConfigData.uuid,
        },
      });
    },
  });
};
