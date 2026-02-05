import { http } from "@/api/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface FilterDeleteDto {
  uuid: string;
}

async function deleteFilter(filterData: FilterDeleteDto) {
  return http.delete("filter", {
    searchParams: { uuid: filterData.uuid },
  });
}

export function useFilterDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filter", "list"] });
    },
  });
}
