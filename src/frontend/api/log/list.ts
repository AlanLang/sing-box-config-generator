import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface LogListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useLogList = () => {
  return useQuery({
    queryKey: ["log", "list"],
    queryFn: async () => {
      return await http.get("log").json<LogListDto[]>();
    },
  });
};
