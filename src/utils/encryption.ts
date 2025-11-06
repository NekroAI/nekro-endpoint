/**
 * API 密钥生成和加密工具函数
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

/**
 * 生成访问密钥（用于端点鉴权）
 * @returns 随机生成的访问密钥，格式为 ep-{32位随机字符串}
 */
export function generateAccessKey(): string {
  const array = new Uint8Array(16); // 16 bytes = 32 hex chars
  crypto.getRandomValues(array);
  const randomString = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `ep-${randomString}`;
}

/**
 * 使用 PBKDF2 哈希访问密钥
 * @param plainKey 明文密钥
 * @returns 哈希后的密钥（hex格式）
 */
export async function hashAccessKey(plainKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(plainKey), "PBKDF2", false, ["deriveBits"]);

  // 使用固定 salt（在生产环境中，可以为每个密钥使用唯一 salt）
  const salt = encoder.encode("nekro-endpoint-access-key-salt");

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256, // 256 bits
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * 验证访问密钥
 * @param plainKey 明文密钥
 * @param hashedKey 哈希后的密钥
 * @returns 是否匹配
 */
export async function verifyAccessKey(plainKey: string, hashedKey: string): Promise<boolean> {
  const newHash = await hashAccessKey(plainKey);
  return newHash === hashedKey;
}
