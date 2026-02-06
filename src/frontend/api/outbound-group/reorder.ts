import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";

export interface ReorderDto {
  uuids: string[];
}

export async function reorderOutboundGroups(uuids: string[]): Promise<void> {
  const payload: ReorderDto = { uuids };
  await ky.post("/api/outbound-group/reorder", { json: payload });
}

export function useOutboundGroupReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderOutboundGroups,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-group", "list"] });
    },
  });
}
