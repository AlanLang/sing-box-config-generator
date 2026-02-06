import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface DnsRule {
  rule_set: string[];
  server: string;
}

export interface DnsConfig {
  config?: string;
  servers: string[];
  rules?: DnsRule[];
  final: string;
}

export interface RouteRule {
  rulesets: string[];
  outbound: string;
}

export interface RouteConfig {
  config?: string;
  rules?: RouteRule[];
  final: string;
  default_domain_resolver?: string;
}

export interface ConfigCreateDto {
  uuid: string;
  name: string;
  log: string;
  dns: DnsConfig;
  inbounds: string[];
  route: RouteConfig;
  experimental: string;
}

export async function createConfig(data: ConfigCreateDto) {
  await http.post("config", { json: data });
}

export function useConfigCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "list"] });
    },
  });
}
