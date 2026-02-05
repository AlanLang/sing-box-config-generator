import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface OutboundUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useOutboundUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OutboundUpdateDto) => {
      return await http.put("outbound", { json: data }).text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound", "list"] });
    },
  });
};
