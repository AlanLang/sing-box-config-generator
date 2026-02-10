import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface OutboundDto {
  tag: string;
  type: string;
  server?: string;
  server_port?: number;
  [key: string]: unknown;
}

export const useSubscribeOutbounds = (uuid: string | null) => {
  return useQuery({
    queryKey: ["subscribe", "outbounds", uuid],
    queryFn: async () => {
      if (!uuid) return [];
      return await http
        .get("subscribe/outbounds", { searchParams: { uuid } })
        .json<OutboundDto[]>();
    },
    enabled: !!uuid,
  });
};
