import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface RouteUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useRouteUpdate = () => {
  return useMutation({
    mutationFn: async (routeData: RouteUpdateDto) => {
      return await http.put("route", {
        json: routeData,
      });
    },
  });
};
