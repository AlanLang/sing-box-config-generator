import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface OutboundDeleteDto {
  uuid: string;
}

export function deleteOutbound(data: OutboundDeleteDto) {
  return http.delete("outbound", {
    searchParams: {
      uuid: data.uuid,
    },
  });
}

export function useOutboundDelete() {
  return useMutation({
    mutationFn: deleteOutbound,
  });
}
