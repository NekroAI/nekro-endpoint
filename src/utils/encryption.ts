/**
 * API 密钥生成工具函数
 * 用于为用户生成唯一的 API Key
 */

/**
 * 生成用户专属的 API 密钥
 * @returns 随机生成的 API 密钥，格式为 sec-{64位十六进制字符串}
 */
export function generateUserApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "sec-" + Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
