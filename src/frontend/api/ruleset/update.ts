import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RulesetUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRulesetUpdate = () => {
  return useMutation({
    mutationFn: async (rulesetData: RulesetUpdateDto) => {
      return await http.put("ruleset", {
        json: rulesetData,
      });
    },
  });
};
