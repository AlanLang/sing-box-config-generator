import { http } from "@/api/http";
import { useMutation } from "@tanstack/react-query";

export interface ExperimentalUpdateDto {
  uuid: string;
  name: string;
  json: string;
}

export const useExperimentalUpdate = () => {
  return useMutation({
    mutationFn: async (experimentalData: ExperimentalUpdateDto) => {
      return await http.put("experimental", {
        json: experimentalData,
      });
    },
  });
};
