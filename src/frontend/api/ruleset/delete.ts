import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RulesetDeleteDto {
  uuid: string;
}

export const useRulesetDelete = () => {
  return useMutation({
    mutationFn: async (rulesetData: RulesetDeleteDto) => {
      return await http.delete("ruleset", {
        searchParams: {
          uuid: rulesetData.uuid,
        },
      });
    },
  });
};
