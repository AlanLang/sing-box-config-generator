import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface DnsListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useDnsList = () => {
  return useQuery({
    queryKey: ["dns-server", "list"],
    queryFn: async () => {
      return await http.get("dns-server").json<DnsListDto[]>();
    },
  });
};
