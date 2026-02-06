import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export async function deleteConfig(uuid: string) {
  await http.delete("config", { searchParams: { uuid } });
}

export function useConfigDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "list"] });
    },
  });
}
