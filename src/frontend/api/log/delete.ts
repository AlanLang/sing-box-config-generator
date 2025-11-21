import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface LogDeleteDto {
  uuid: string;
}

export function deleteLog(data: LogDeleteDto) {
  return http.delete("log", {
    searchParams: {
      uuid: data.uuid,
    },
  });
}

export function useLogDelete() {
  return useMutation({
    mutationFn: deleteLog,
  });
}
