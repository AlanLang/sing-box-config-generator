import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";

export function useOutboundGroupDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uuid: string) => {
      await ky.delete("/api/outbound-group", {
        searchParams: { uuid },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-group", "list"] });
    },
  });
}
