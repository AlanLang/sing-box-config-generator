import { http } from "@/api/http";

export async function deleteConfig(uuid: string) {
  await http.delete("config", { searchParams: { uuid } });
}
