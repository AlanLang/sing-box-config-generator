import { useQuery } from "@tanstack/react-query";
import ky from "ky";

export interface RulesetOption {
  uuid: string;
  value: string;
  label: string;
}

export function useRulesetOptions() {
  return useQuery({
    queryKey: ["ruleset", "options"],
    queryFn: async () => {
      const response = await ky
        .get("/api/ruleset/options")
        .json<RulesetOption[]>();
      return response;
    },
  });
}
