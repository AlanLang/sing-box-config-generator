import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface FilterListDto {
  uuid: string;
  name: string;
  filter_type: "simple" | "regex";
  pattern: string;
  except?: string;
}

async function listFilters() {
  const response = await http.get("filter");
  return response.json<FilterListDto[]>();
}

export function useFilterList() {
  return useQuery({
    queryKey: ["filter", "list"],
    queryFn: listFilters,
  });
}
