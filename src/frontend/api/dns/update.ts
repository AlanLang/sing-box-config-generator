import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface DnsUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useDnsUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DnsUpdateDto) => {
      return await http.put("dns-server", { json: data }).text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns-server", "list"] });
    },
  });
};
