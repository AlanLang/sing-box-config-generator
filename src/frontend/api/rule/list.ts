import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface RuleListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRuleList = () => {
  return useQuery({
    queryKey: ["rule", "list"],
    queryFn: async () => {
      return await http.get("rule").json<RuleListDto[]>();
    },
  });
};
