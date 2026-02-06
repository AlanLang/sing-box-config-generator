import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface BackupDeleteDto {
  uuid: string;
}

export function deleteBackup(data: BackupDeleteDto) {
  return http.delete("backup", {
    searchParams: {
      uuid: data.uuid,
    },
  });
}

export function useBackupDelete() {
  return useMutation({
    mutationFn: deleteBackup,
  });
}
