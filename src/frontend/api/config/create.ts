import { http } from "@/api/http";

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
}

export interface ConfigCreateDto {
  uuid: string;
  name: string;
  log: string;
  dns: DnsConfig;
  inbounds: string[];
  route: RouteConfig;
  experimental?: string;
}

export async function createConfig(data: ConfigCreateDto) {
  await http.post("config", { json: data });
}
