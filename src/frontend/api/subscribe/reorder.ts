import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import type { SubscribeListDto } from "./list";

export interface ReorderDto {
  uuids: string[];
}

export async function reorderSubscribes(uuids: string[]): Promise<void> {
  const payload: ReorderDto = { uuids };
  await ky.post("/api/subscribe/reorder", { json: payload });
}

export function useSubscribeReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderSubscribes,
    onMutate: async (uuids) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["subscribe", "list"] });

      // Snapshot the previous value
      const previousSubscribes = queryClient.getQueryData<SubscribeListDto[]>([
        "subscribe",
        "list",
      ]);

      // Optimistically update to the new value
      if (previousSubscribes) {
        const reorderedSubscribes = uuids
          .map((uuid) => previousSubscribes.find((s) => s.uuid === uuid))
          .filter((s): s is SubscribeListDto => s !== undefined);

        queryClient.setQueryData<SubscribeListDto[]>(
          ["subscribe", "list"],
          reorderedSubscribes,
        );
      }

      // Return context with the previous value
      return { previousSubscribes };
    },
    onError: (_err, _uuids, context) => {
      // If the mutation fails, rollback to the previous value
      if (context?.previousSubscribes) {
        queryClient.setQueryData(
          ["subscribe", "list"],
          context.previousSubscribes,
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["subscribe", "list"] });
    },
  });
}
