import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface SubscribeDeleteDto {
  uuid: string;
}

export const useSubscribeDelete = () => {
  return useMutation({
    mutationFn: async (subscribeData: SubscribeDeleteDto) => {
      return await http.delete("subscribe", {
        searchParams: {
          uuid: subscribeData.uuid,
        },
      });
    },
  });
};
