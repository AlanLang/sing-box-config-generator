import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface InboundUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useInboundUpdate = () => {
  return useMutation({
    mutationFn: async (inboundData: InboundUpdateDto) => {
      return await http.put("inbound", {
        json: inboundData,
      });
    },
  });
};
