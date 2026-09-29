import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import type { AccessKey } from "../../../common/types";
import { buildEndpointAccessUrl, createEndpointQr, isShareableAccessKey } from "./endpointShare";

const key: AccessKey = {
  id: "key-one",
  permissionGroupId: "group-one",
  keyValue: `ep-${"a".repeat(32)}`,
  description: "phone",
  expiresAt: null,
  isActive: true,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("endpoint QR sharing", () => {
  it("encodes a protected endpoint URL without losing the access key", () => {
    const value = buildEndpointAccessUrl("https://ep.example", "owner", "/proxy/shadowrocket", key.keyValue);
    const parsed = new URL(value);
    expect(parsed.pathname).toBe("/e/owner/proxy/shadowrocket");
    expect(parsed.searchParams.get("access_key")).toBe(key.keyValue);
    expect(parsed.searchParams.size).toBe(1);
  });

  it("does not add credentials to a public endpoint and uses only the origin", () => {
    expect(buildEndpointAccessUrl("https://ep.example/ignored?token=ignored", "owner", "/public")).toBe(
      "https://ep.example/e/owner/public",
    );
  });

  it("encodes query delimiters and Unicode as data", () => {
    const value = buildEndpointAccessUrl("https://ep.example", "用户", "/folder/a?b#c", "ep-key&other=value");
    const parsed = new URL(value);
    expect(parsed.searchParams.get("access_key")).toBe("ep-key&other=value");
    expect(parsed.searchParams.has("other")).toBe(false);
    expect(parsed.hash).toBe("");
    expect(parsed.pathname).toContain("a%3Fb%23c");
  });

  it.each(["sec-management-key", "browser-session"])("never uses a management credential in QR links: %s", (value) => {
    expect(() => buildEndpointAccessUrl("https://ep.example", "owner", "/proxy", value)).toThrow();
  });

  it("rejects invalid origins and dot-segment paths", () => {
    expect(() => buildEndpointAccessUrl("javascript:alert(1)", "owner", "/proxy")).toThrow();
    expect(() => buildEndpointAccessUrl("https://u:p@ep.example", "owner", "/proxy")).toThrow();
    expect(() => buildEndpointAccessUrl("https://ep.example", "owner", "/../proxy")).toThrow();
  });

  it("only accepts active keys for the endpoint's permission groups", () => {
    expect(isShareableAccessKey(key, ["group-one"])).toBe(true);
    expect(isShareableAccessKey(key, ["another-group"])).toBe(false);
    expect(isShareableAccessKey({ ...key, isActive: false }, ["group-one"])).toBe(false);
    expect(isShareableAccessKey({ ...key, keyValue: "sec-management" }, ["group-one"])).toBe(false);
  });

  it("rejects expired and malformed expiry dates at confirmation time", () => {
    const now = new Date("2026-09-29T00:00:00Z").getTime();
    expect(isShareableAccessKey({ ...key, expiresAt: "2026-09-29T00:00:00Z" }, ["group-one"], now)).toBe(false);
    expect(isShareableAccessKey({ ...key, expiresAt: "invalid" }, ["group-one"], now)).toBe(false);
    expect(isShareableAccessKey({ ...key, expiresAt: "2026-09-30T00:00:00Z" }, ["group-one"], now)).toBe(true);
  });

  it("generates a PNG that an independent decoder reads as the exact subscription URL", async () => {
    const value = buildEndpointAccessUrl("https://ep.example", "owner", "/proxy/shadowrocket", key.keyValue);
    const image = await createEndpointQr(value);
    expect(image.startsWith("data:image/png;base64,")).toBe(true);
    const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(value);
    expect(png.width).toBe(720);
  });
});
