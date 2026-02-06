import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface BackupListDto {
  uuid: string;
  name: string;
  description: string;
  created_at: string;
  file_name: string;
  file_size: number;
}

export const useBackupList = () => {
  return useQuery({
    queryKey: ["backup", "list"],
    queryFn: async () => {
      return await http.get("backup").json<BackupListDto[]>();
    },
  });
};
