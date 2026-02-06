import type { BackupListDto } from "@/api/backup/list";
import { http } from "@/api/http";
import { HTTPError } from "ky";

export type UploadBackupResult =
  | { status: "created"; data: BackupListDto }
  | { status: "conflict"; name: string };

export async function uploadBackup(file: File): Promise<UploadBackupResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const data = await http
      .post("backup/upload", { body: formData })
      .json<BackupListDto>();
    return { status: "created", data };
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) {
      const body = await error.response.json<{
        error: string;
        name: string;
      }>();
      return { status: "conflict", name: body.name };
    }
    throw error;
  }
}
