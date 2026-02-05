export type GroupType = "selector" | "urltest";

export interface OutboundGroupDto {
  uuid: string;
  name: string;
  group_type: GroupType;
  outbounds: string[];
  default?: string;
  url?: string;
  interval?: string;
  tolerance?: number;
  idle_timeout?: string;
  interrupt_exist_connections?: boolean;
}

export interface OutboundGroupListDto {
  uuid: string;
  name: string;
  group_type: GroupType;
}

export interface OutboundOption {
  uuid: string;
  value: string;
  label: string;
  source: "outbound" | "filter";
  type?: string;
}
