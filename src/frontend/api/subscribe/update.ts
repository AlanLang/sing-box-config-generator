import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface SubscribeUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useSubscribeUpdate = () => {
  return useMutation({
    mutationFn: async (subscribeData: SubscribeUpdateDto) => {
      return await http.put("subscribe", {
        json: subscribeData,
      });
    },
  });
};
