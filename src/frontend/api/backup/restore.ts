import { http } from "@/api/http";

export function restoreBackup(data: { uuid: string }) {
  return http.post("backup/restore", {
    searchParams: {
      uuid: data.uuid,
    },
  });
}
