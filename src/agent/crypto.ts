/**
 * AES-GCM encryption for stored model API keys (docs/REDESIGN.md §5.6).
 * The key is derived from the AI_CONFIG_SECRET Worker secret.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function deriveKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(secret: string, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(secret), encoder.encode(plaintext));
  return { encryptedKey: toBase64(cipher), iv: toBase64(iv) };
}

export async function decryptSecret(secret: string, encryptedKey: string, iv: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await deriveKey(secret),
    fromBase64(encryptedKey),
  );
  return decoder.decode(plain);
}

export const keyHint = (apiKey: string) => (apiKey.length > 8 ? `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}` : "••••");
