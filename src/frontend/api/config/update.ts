import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConfigCreateDto } from "./create";

export interface ConfigUpdateDto extends ConfigCreateDto {}

export async function updateConfig(data: ConfigUpdateDto) {
  await http.put("config", { json: data });
}

export function useConfigUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "list"] });
    },
  });
}
