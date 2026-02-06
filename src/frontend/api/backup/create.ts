import { http } from "@/api/http";

export interface BackupCreateDto {
  uuid: string;
  name: string;
  description: string;
}

export function createBackup(data: BackupCreateDto) {
  return http.post("backup", {
    json: data,
  });
}
