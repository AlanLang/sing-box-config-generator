import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface FilterUpdateDto {
  uuid: string;
  name: string;
  filter_type: "simple" | "regex";
  pattern: string;
  except?: string;
}

async function updateFilter(filterData: FilterUpdateDto) {
  return http.put("filter", {
    json: filterData,
  });
}

export function useFilterUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter", "list"] });
    },
  });
}
