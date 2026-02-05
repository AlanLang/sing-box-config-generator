import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import type { OutboundGroupDto } from "./types";

export function useOutboundGroupList() {
  return useQuery({
    queryKey: ["outbound-group", "list"],
    queryFn: async () => {
      const response = await ky
        .get("/api/outbound-group")
        .json<OutboundGroupDto[]>();
      return response;
    },
  });
}
