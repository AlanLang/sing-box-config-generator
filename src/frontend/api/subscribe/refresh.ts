import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface SubscribeRefreshDto {
  uuid: string;
}

export const useSubscribeRefresh = () => {
  return useMutation({
    mutationFn: async (subscribeData: SubscribeRefreshDto) => {
      return await http.post("subscribe/refresh", {
        searchParams: {
          uuid: subscribeData.uuid,
        },
      });
    },
  });
};
