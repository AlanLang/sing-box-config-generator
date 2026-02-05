import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface OutboundListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useOutboundList = () => {
  return useQuery({
    queryKey: ["outbound", "list"],
    queryFn: async () => {
      return await http.get("outbound").json<OutboundListDto[]>();
    },
  });
};
