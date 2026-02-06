import { z } from "zod";

/**
 * 名称校验正则：支持中文、英文、数字、空格、下划线、连字符
 * - 中文：\u4e00-\u9fa5
 * - 英文：a-zA-Z
 * - 数字：0-9
 * - 其他：空格、下划线、连字符
 */
const NAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9\s_-]+$/;

/**
 * 创建一个通用的名称校验 schema
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
    .regex(NAME_REGEX, {
      message:
        "Name can only contain Chinese, English, numbers, spaces, underscores and hyphens",
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
