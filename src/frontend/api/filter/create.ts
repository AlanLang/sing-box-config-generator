import { http } from "@/api/http";
import z from "zod/v3";

export const filterCreateSchema = z.object({
  uuid: z.string(),
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(50, {
      message: "Name must be less than 50 characters.",
    }),
  filter_type: z.enum(["simple", "regex"], {
    errorMap: () => ({ message: "Filter type must be 'simple' or 'regex'" }),
  }),
  pattern: z.string().min(1, {
    message: "Pattern cannot be empty.",
  }),
});

export type FilterCreateDto = z.infer<typeof filterCreateSchema>;

export function createFilter(filterData: FilterCreateDto) {
  return http.post("filter", {
    json: filterData,
  });
}
