import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface DnsRule {
  rule_set: string[];
  server: string;
}

export interface DnsServerEntry {
  uuid: string;
  detour?: string;
}

export interface DnsConfig {
  config?: string;
  servers: DnsServerEntry[];
  rules?: DnsRule[];
  final: string;
}

export type RouteRule =
  | { type: "ruleset"; rulesets: string[]; outbound: string }
  | { type: "rule"; rule: string; outbound?: string };

export interface RouteConfig {
  config?: string;
  rules?: RouteRule[];
  final: string;
  default_domain_resolver?: string;
}

export interface ExtConfig {
  download_detour: string;
}

export interface ConfigCreateDto {
  uuid: string;
  name: string;
  description?: string;
  log: string;
  dns: DnsConfig;
  inbounds: string[];
  route: RouteConfig;
  experimental: string;
  ext_config: ExtConfig;
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
