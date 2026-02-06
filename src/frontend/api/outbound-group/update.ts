import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import type { OutboundGroupDto } from "./types";
import type { OutboundGroupCreateInput } from "./create";

export function useOutboundGroupUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uuid,
      data,
    }: {
      uuid: string;
      data: OutboundGroupCreateInput;
    }) => {
      const payload: OutboundGroupDto = {
        uuid,
        ...data,
      };

      const response = await ky
        .put("/api/outbound-group", {
          searchParams: { uuid },
          json: payload,
        })
        .json<OutboundGroupDto>();
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-group", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["outbound-group", "options"],
      });
    },
  });
}
