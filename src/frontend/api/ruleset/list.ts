import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface RulesetListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRulesetList = () => {
  return useQuery({
    queryKey: ["ruleset", "list"],
    queryFn: async () => {
      return await http.get("ruleset").json<RulesetListDto[]>();
    },
  });
};
