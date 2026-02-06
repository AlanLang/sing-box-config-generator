import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import type { OutboundGroupDto } from "./types";

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
    onMutate: async (uuids) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["outbound-group", "list"] });

      // Snapshot the previous value
      const previousGroups = queryClient.getQueryData<OutboundGroupDto[]>([
        "outbound-group",
        "list",
      ]);

      // Optimistically update to the new value
      if (previousGroups) {
        const reorderedGroups = uuids
          .map((uuid) => previousGroups.find((g) => g.uuid === uuid))
          .filter((g): g is OutboundGroupDto => g !== undefined);

        queryClient.setQueryData<OutboundGroupDto[]>(
          ["outbound-group", "list"],
          reorderedGroups,
        );
      }

      // Return context with the previous value
      return { previousGroups };
    },
    onError: (_err, _uuids, context) => {
      // If the mutation fails, rollback to the previous value
      if (context?.previousGroups) {
        queryClient.setQueryData(
          ["outbound-group", "list"],
          context.previousGroups,
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["outbound-group", "list"] });
    },
  });
}
