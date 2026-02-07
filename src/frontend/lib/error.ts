/**
 * 从错误对象中提取可读的错误信息
 * @param error 错误对象
 * @param defaultMessage 默认错误信息
 * @returns 错误信息字符串
 */
export async function extractErrorMessage(
  error: unknown,
  defaultMessage = "操作失败，请稍后重试",
): Promise<string> {
  const err = error as Record<string, unknown> | null | undefined;

  // 如果错误有 response 属性（ky 错误）
  if (err?.response) {
    try {
      // 尝试读取响应文本
      const text = await (err.response as Response).text();
      if (text) {
        return text;
      }
    } catch (e) {
      console.error("Failed to parse error response:", e);
    }
  }

  // 如果错误有 message 属性
  if (err?.message && typeof err.message === "string") {
    return err.message;
  }

  // 如果错误是字符串
  if (typeof error === "string") {
    return error;
  }

  // 返回默认消息
  return defaultMessage;
}
