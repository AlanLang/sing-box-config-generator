import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface ExperimentalListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useExperimentalList = () => {
  return useQuery({
    queryKey: ["experimental", "list"],
    queryFn: async () => {
      return await http.get("experimental").json<ExperimentalListDto[]>();
    },
  });
};
