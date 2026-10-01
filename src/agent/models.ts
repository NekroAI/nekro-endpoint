import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { eq, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import { aiProviderConfigs } from "../db/schema";
import { isTargetUrlSafe } from "../utils/security";
import type { Bindings } from "../types";
import { decryptSecret } from "./crypto";

export type AiProvider = "openai" | "anthropic" | "openai-compatible";
export type ModelSettings = { provider: AiProvider; model: string; baseUrl: string | null; apiKey: string };

type Db = DrizzleD1Database<typeof drizzleSchema>;
type ConfigRow = typeof aiProviderConfigs.$inferSelect;

export async function loadConfigs(db: Db, userId: string) {
  const [user, platform] = await Promise.all([
    db.query.aiProviderConfigs.findFirst({ where: eq(aiProviderConfigs.ownerUserId, userId) }),
    db.query.aiProviderConfigs.findFirst({ where: isNull(aiProviderConfigs.ownerUserId) }),
  ]);
  return { user: user ?? null, platform: platform ?? null };
}

export function platformConfigWhere() {
  return isNull(aiProviderConfigs.ownerUserId);
}

/** The user's own model wins over the platform default. */
export async function resolveModelSettings(env: Bindings, db: Db, userId: string): Promise<ModelSettings | null> {
  if (!env.AI_CONFIG_SECRET) return null;
  const { user, platform } = await loadConfigs(db, userId);
  const row: ConfigRow | null = user ?? platform;
  if (!row) return null;
  return {
    provider: row.provider as AiProvider,
    model: row.model,
    baseUrl: row.baseUrl,
    apiKey: await decryptSecret(env.AI_CONFIG_SECRET, row.encryptedKey, row.iv),
  };
}

/** Base URLs are fetched server-side, so they get the same SSRF guard as proxies. */
export function assertSafeBaseUrl(baseUrl: string | null | undefined) {
  if (baseUrl && !isTargetUrlSafe(baseUrl)) {
    throw new Error("Base URL 不能指向内网或本机地址（本地模型请通过公网隧道暴露）");
  }
}

export function createModel(settings: ModelSettings): LanguageModel {
  assertSafeBaseUrl(settings.baseUrl);
  const baseURL = settings.baseUrl || undefined;
  switch (settings.provider) {
    case "openai":
      return createOpenAI({ apiKey: settings.apiKey, baseURL })(settings.model);
    case "anthropic":
      return createAnthropic({ apiKey: settings.apiKey, baseURL })(settings.model);
    case "openai-compatible":
      if (!baseURL) throw new Error("OpenAI 兼容服务需要 Base URL");
      return createOpenAICompatible({ name: "compatible", apiKey: settings.apiKey, baseURL })(settings.model);
  }
}
