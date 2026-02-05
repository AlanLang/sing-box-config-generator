import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RuleDeleteDto {
  uuid: string;
}

export const useRuleDelete = () => {
  return useMutation({
    mutationFn: async (ruleData: RuleDeleteDto) => {
      return await http.delete("rule", {
        searchParams: {
          uuid: ruleData.uuid,
        },
      });
    },
  });
};
