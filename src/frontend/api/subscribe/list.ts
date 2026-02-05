import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface SubscribeListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useSubscribeList = () => {
  return useQuery({
    queryKey: ["subscribe", "list"],
    queryFn: async () => {
      return await http.get("subscribe").json<SubscribeListDto[]>();
    },
  });
};
