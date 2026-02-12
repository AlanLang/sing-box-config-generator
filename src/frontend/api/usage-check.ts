import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface ConfigUsage {
  uuid: string;
  name: string;
}

export interface UsageCheckResponse {
  is_used: boolean;
  used_by_configs: ConfigUsage[];
}

export const useResourceUsageCheck = (
  uuid: string,
  resourceType: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["usage-check", resourceType, uuid],
    queryFn: async () => {
      return await http
        .get("usage-check", {
          searchParams: {
            uuid,
            resource_type: resourceType,
          },
        })
        .json<UsageCheckResponse>();
    },
    enabled,
  });
};
