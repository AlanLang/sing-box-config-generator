import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LogUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useLogUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogUpdateDto) => {
      return await http.put("log", { json: data }).text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["log", "list"] });
    },
  });
};
