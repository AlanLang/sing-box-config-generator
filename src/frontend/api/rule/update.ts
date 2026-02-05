import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RuleUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRuleUpdate = () => {
  return useMutation({
    mutationFn: async (ruleData: RuleUpdateDto) => {
      return await http.put("rule", {
        json: ruleData,
      });
    },
  });
};
