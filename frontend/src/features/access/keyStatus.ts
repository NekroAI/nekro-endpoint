import type { AccessKey } from "../../../../common/types";

export type KeyStatus = "active" | "expiring" | "expired" | "revoked";

const WEEK = 7 * 86_400_000;

export function keyStatus(key: Pick<AccessKey, "isActive" | "expiresAt">, now = Date.now()): KeyStatus {
  if (!key.isActive) return "revoked";
  if (!key.expiresAt) return "active";
  const left = new Date(key.expiresAt).getTime() - now;
  if (left <= 0) return "expired";
  return left < WEEK ? "expiring" : "active";
}

export const keyStatusLabel: Record<KeyStatus, string> = {
  active: "有效",
  expiring: "即将到期",
  expired: "已过期",
  revoked: "已吊销",
};
