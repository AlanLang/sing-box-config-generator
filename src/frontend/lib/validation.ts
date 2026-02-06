import { z } from "zod";

/**
 * 创建一个通用的名称校验 schema
 * 支持任意 Unicode 字符，包括中文、英文、数字、emoji 等
 * @param minLength 最小长度，默认 2
 * @param maxLength 最大长度，默认 50
 * @returns Zod string schema
 */
export function createNameSchema(minLength = 2, maxLength = 50) {
  return z
    .string()
    .min(minLength, {
      message: `Name must be at least ${minLength} characters`,
    })
    .max(maxLength, {
      message: `Name must be less than ${maxLength} characters`,
    })
    .refine((val) => val.trim().length > 0, {
      message: "Name cannot be empty or only whitespace",
    });
}

/**
 * 默认的名称校验 schema (2-50 字符)
 */
export const nameSchema = createNameSchema();

/**
 * 短名称校验 schema (2-20 字符)
 */
export const shortNameSchema = createNameSchema(2, 20);
