import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";
import type { DnsConfig, ExtConfig, RouteConfig } from "./create";

export interface ConfigListDto {
  uuid: string;
  name: string;
  log: string;
  dns: DnsConfig;
  inbounds: string[];
  route: RouteConfig;
  experimental: string;
  ext_config: ExtConfig;
}

export const useConfigList = () => {
  return useQuery({
    queryKey: ["config", "list"],
    queryFn: async () => {
      return await http.get("config").json<ConfigListDto[]>();
    },
  });
};
