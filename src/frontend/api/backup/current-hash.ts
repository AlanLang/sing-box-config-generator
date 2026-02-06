import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface ContentHashResponse {
  content_hash: string;
}

export const useCurrentConfigHash = () => {
  return useQuery({
    queryKey: ["backup", "current-hash"],
    queryFn: async () => {
      return await http.get("backup/current-hash").json<ContentHashResponse>();
    },
  });
};
