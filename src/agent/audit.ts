import { drizzle } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import { agentActions } from "../db/schema";
import type { Bindings } from "../types";
import { redact } from "./redact";

/** Records a tool invocation. Auditing must never break the tool call itself. */
export async function recordAction(
  env: Bindings,
  entry: { userId: string; source: "signal" | "mcp"; tool: string; input: unknown; ok: boolean; message?: string },
) {
  try {
    const db = drizzle(env.DB, { schema: drizzleSchema });
    await db.insert(agentActions).values({
      userId: entry.userId,
      source: entry.source,
      tool: entry.tool,
      input: JSON.stringify(redact(entry.input ?? {})).slice(0, 2000),
      ok: entry.ok,
      message: entry.message?.slice(0, 500) ?? null,
    });
  } catch (error) {
    console.error("agent audit failed", error instanceof Error ? error.message : error);
  }
}
