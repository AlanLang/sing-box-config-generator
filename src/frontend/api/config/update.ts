import { http } from "@/api/http";
import type { ConfigCreateDto } from "./create";

export interface ConfigUpdateDto extends ConfigCreateDto {}

export async function updateConfig(data: ConfigUpdateDto) {
  await http.put("config", { json: data });
}
