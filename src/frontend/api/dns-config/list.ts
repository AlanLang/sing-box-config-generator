import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface DnsConfigListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useDnsConfigList = () => {
  return useQuery({
    queryKey: ["dns-config", "list"],
    queryFn: async () => {
      return await http.get("dns-config").json<DnsConfigListDto[]>();
    },
  });
};
