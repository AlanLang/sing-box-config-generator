import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface ExperimentalDeleteDto {
  uuid: string;
}

export const useExperimentalDelete = () => {
  return useMutation({
    mutationFn: async (experimentalData: ExperimentalDeleteDto) => {
      return await http.delete("experimental", {
        searchParams: {
          uuid: experimentalData.uuid,
        },
      });
    },
  });
};
