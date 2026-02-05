import { useQuery } from "@tanstack/react-query";
import ky from "ky";
import type { OutboundOption } from "./types";

export function useOutboundGroupOptions() {
  return useQuery({
    queryKey: ["outbound-group", "options"],
    queryFn: async () => {
      const response = await ky
        .get("/api/outbound-group/options")
        .json<OutboundOption[]>();
      return response;
    },
  });
}
