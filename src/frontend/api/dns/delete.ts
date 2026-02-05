import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface DnsDeleteDto {
  uuid: string;
}

export function deleteDns(data: DnsDeleteDto) {
  return http.delete("dns-server", {
    searchParams: {
      uuid: data.uuid,
    },
  });
}

export function useDnsDelete() {
  return useMutation({
    mutationFn: deleteDns,
  });
}
