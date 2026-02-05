import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface InboundDeleteDto {
  uuid: string;
}

export const useInboundDelete = () => {
  return useMutation({
    mutationFn: async (inboundData: InboundDeleteDto) => {
      return await http.delete("inbound", {
        searchParams: {
          uuid: inboundData.uuid,
        },
      });
    },
  });
};
