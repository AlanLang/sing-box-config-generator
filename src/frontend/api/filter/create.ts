import { http } from "@/api/http";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export const filterCreateSchema = z.object({
  uuid: z.string(),
  name: nameSchema,
  filter_type: z.enum(["simple", "regex"], {
    message: "Filter type must be 'simple' or 'regex'",
  }),
  pattern: z.string().min(1, {
    message: "Pattern cannot be empty.",
  }),
  except: z.string().optional(),
});

export type FilterCreateDto = z.infer<typeof filterCreateSchema>;

export function createFilter(filterData: FilterCreateDto) {
  return http.post("filter", {
    json: filterData,
  });
}
