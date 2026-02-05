import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RouteDeleteDto {
  uuid: string;
}

export const useRouteDelete = () => {
  return useMutation({
    mutationFn: async (routeData: RouteDeleteDto) => {
      return await http.delete("route", {
        searchParams: {
          uuid: routeData.uuid,
        },
      });
    },
  });
};
