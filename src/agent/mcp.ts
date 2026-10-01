import { zodSchema } from "ai";
import { TOOLS, runTool, type ToolContext, type ToolDefinition } from "./tools";

/**
 * A minimal, dependency-free MCP server for the stateless Streamable HTTP
 * transport (JSON responses). It implements the lifecycle and tools methods
 * the platform needs; everything else answers "method not found".
 * Spec: https://modelcontextprotocol.io/specification
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

export type McpHooks = {
  onToolCall?: (tool: ToolDefinition, input: unknown, outcome: { ok: boolean; message?: string }) => Promise<void>;
};

const error = (id: JsonRpcResponse["id"], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

async function toolList() {
  return Promise.all(
    TOOLS.map(async (tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: await zodSchema(tool.input).jsonSchema,
      annotations: {
        title: tool.title,
        readOnlyHint: tool.risk === "read",
        destructiveHint: tool.risk === "destructive" || tool.risk === "publish",
        openWorldHint: false,
      },
    })),
  );
}

async function handle(message: JsonRpcRequest, context: ToolContext, instructions: string, hooks: McpHooks) {
  const id = message.id ?? null;
  switch (message.method) {
    case "initialize": {
      const requested = String(message.params?.protocolVersion ?? "");
      return {
        jsonrpc: "2.0" as const,
        id,
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "endpoints", title: "Endpoints", version: "1.0.0" },
          instructions,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0" as const, id, result: {} };
    case "tools/list":
      return { jsonrpc: "2.0" as const, id, result: { tools: await toolList() } };
    case "tools/call": {
      const name = String(message.params?.name ?? "");
      const tool = TOOLS.find((candidate) => candidate.name === name);
      if (!tool) return error(id, -32602, `Unknown tool: ${name}`);
      const input = message.params?.arguments ?? {};
      try {
        const result = await runTool(tool, context, input);
        await hooks.onToolCall?.(tool, input, { ok: true });
        return {
          jsonrpc: "2.0" as const,
          id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false },
        };
      } catch (caught) {
        const text = caught instanceof Error ? caught.message : String(caught);
        await hooks.onToolCall?.(tool, input, { ok: false, message: text });
        return { jsonrpc: "2.0" as const, id, result: { content: [{ type: "text", text }], isError: true } };
      }
    }
    default:
      return error(id, -32601, `Method not found: ${message.method}`);
  }
}

export async function handleMcpRequest(request: Request, context: ToolContext, instructions: string, hooks: McpHooks = {}) {
  if (request.method === "GET") {
    // No server-initiated stream in stateless mode.
    return new Response(null, { status: 405, headers: { Allow: "POST, DELETE" } });
  }
  if (request.method === "DELETE") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(error(null, -32700, "Parse error"), { status: 400 });
  }

  const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
  if (messages.some((message) => !message || message.jsonrpc !== "2.0" || typeof message.method !== "string")) {
    return Response.json(error(null, -32600, "Invalid Request"), { status: 400 });
  }

  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    // Notifications (no id) get no response.
    if (message.id === undefined || message.id === null) continue;
    responses.push(await handle(message, context, instructions, hooks));
  }
  if (responses.length === 0) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(payload) ? responses : responses[0]);
}
