import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface InboundListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useInboundList = () => {
  return useQuery({
    queryKey: ["inbound", "list"],
    queryFn: async () => {
      return await http.get("inbound").json<InboundListDto[]>();
    },
  });
};
