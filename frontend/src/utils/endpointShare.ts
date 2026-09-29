import type { AccessKey } from "../../../common/types";

export function buildEndpointAccessUrl(
  origin: string,
  username: string,
  endpointPath: string,
  accessKey?: string,
): string {
  const base = new URL(origin);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
    throw new Error("Invalid endpoint origin");
  }
  if (
    !username ||
    !endpointPath.startsWith("/") ||
    endpointPath.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error("Invalid endpoint path");
  }
  if (accessKey !== undefined && !accessKey.startsWith("ep-")) {
    throw new Error("An endpoint access key is required, not a management credential");
  }
  const encodedPath = endpointPath.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`/e/${encodeURIComponent(username)}${encodedPath}`, base.origin);
  if (accessKey) url.searchParams.set("access_key", accessKey);
  return url.toString();
}

export function isShareableAccessKey(key: AccessKey, permissionGroupIds: string[], now = Date.now()): boolean {
  return (
    key.isActive &&
    key.keyValue.startsWith("ep-") &&
    permissionGroupIds.includes(key.permissionGroupId) &&
    (!key.expiresAt || new Date(key.expiresAt).getTime() > now)
  );
}

export async function createEndpointQr(url: string): Promise<string> {
  // Lazy and local: no QR service receives the access URL; not run during SSR.
  const { toDataURL } = await import("qrcode");
  return toDataURL(url, {
    width: 720,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
