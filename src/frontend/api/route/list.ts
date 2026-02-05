import { http } from "@/api/http";
import { useQuery } from "@tanstack/react-query";

export interface RouteListDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRouteList = () => {
  return useQuery({
    queryKey: ["route", "list"],
    queryFn: async () => {
      return await http.get("route").json<RouteListDto[]>();
    },
  });
};
