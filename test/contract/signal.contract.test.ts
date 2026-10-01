import { env, fetchMock, SELF } from "cloudflare:test";
import { readUIMessageStream, type UIMessage, type UIMessageChunk } from "ai";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { alice, ALICE_KEY, api, bob, data, ORIGIN, seed } from "./helpers";

/**
 * Signal Line end to end against a mocked OpenAI-compatible model
 * (docs/REDESIGN.md §5). Verifies the approval gate: writes never run until
 * the user approves them in a follow-up request.
 */
beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
beforeEach(seed);
afterEach(() => fetchMock.assertNoPendingInterceptors());

const LLM = "https://llm.test";

const sse = (chunks: unknown[]) =>
  chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
const base = { id: "c1", object: "chat.completion.chunk", created: 1, model: "m" };

function mockToolCall(name: string, args: Record<string, unknown>) {
  fetchMock
    .get(LLM)
    .intercept({ path: "/v1/chat/completions", method: "POST" })
    .reply(
      200,
      sse([
        {
          ...base,
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    index: 0,
                    id: `call_${name}`,
                    type: "function",
                    function: { name, arguments: JSON.stringify(args) },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          ...base,
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      ]),
      { headers: { "content-type": "text/event-stream" } },
    );
}

function mockText(text: string) {
  fetchMock
    .get(LLM)
    .intercept({ path: "/v1/chat/completions", method: "POST" })
    .reply(
      200,
      sse([
        { ...base, choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] },
        {
          ...base,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      ]),
      { headers: { "content-type": "text/event-stream" } },
    );
}

const configure = () =>
  api("/signal/config", {
    method: "PUT",
    token: alice.apiKey,
    body: { provider: "openai-compatible", model: "m", baseUrl: `${LLM}/v1`, apiKey: "sk-test-1234567890" },
  });

/** `continues`: the assistant message the stream appends to, as useChat does after an approval. */
async function chat(messages: UIMessage[], token = alice.apiKey, continues?: UIMessage) {
  const response = await SELF.fetch(`${ORIGIN}/api/signal/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    return { status: response.status, body: await response.json(), message: null as UIMessage | null, raw: "" };
  }
  const raw = await response.text();
  const chunks = raw
    .split("\n\n")
    .map((block) => block.replace(/^data: /, "").trim())
    .filter((line) => line && line !== "[DONE]")
    .map((line) => JSON.parse(line) as UIMessageChunk);
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
  let message: UIMessage | null = null;
  for await (const update of readUIMessageStream({ stream, message: continues })) message = update;
  return { status: response.status, body: null, message, raw };
}

const user = (text: string): UIMessage => ({ id: `u-${text}`, role: "user", parts: [{ type: "text", text }] });

type ToolPart = {
  type: string;
  state: string;
  input?: unknown;
  output?: unknown;
  approval?: { id: string; approved?: boolean };
};
const toolParts = (message: UIMessage | null) =>
  (message?.parts ?? []).filter((part) => part.type.startsWith("tool-")) as ToolPart[];

function approve(message: UIMessage, approved: boolean): UIMessage {
  return {
    ...message,
    parts: message.parts.map((part) => {
      const tool = part as ToolPart;
      return tool.state === "approval-requested"
        ? ({ ...tool, state: "approval-responded", approval: { id: tool.approval!.id, approved } } as never)
        : part;
    }),
  };
}

const endpointPaths = async () =>
  data<{ endpoints: { path: string }[] }>(
    await api("/endpoints?view=flat&includeDisabled=true", { token: alice.apiKey }),
  ).endpoints.map((endpoint) => endpoint.path);

describe("model configuration (REDESIGN §5.6)", () => {
  it("stores the key encrypted and only ever returns a hint", async () => {
    expect((await configure()).status).toBe(200);
    const state = data<any>(await api("/signal/config", { token: alice.apiKey }));
    expect(state).toMatchObject({
      available: true,
      active: "user",
      user: { provider: "openai-compatible", model: "m", keyHint: "sk-…7890" },
    });
    expect(JSON.stringify(state)).not.toContain("sk-test-1234567890");
    const row = await env.DB.prepare("SELECT encrypted_key FROM ai_provider_configs").first<{
      encrypted_key: string;
    }>();
    expect(row!.encrypted_key).not.toContain("sk-test");
  });

  it("rejects base URLs that point at private networks", async () => {
    const res = await api("/signal/config", {
      method: "PUT",
      token: alice.apiKey,
      body: { provider: "openai-compatible", model: "m", baseUrl: "http://127.0.0.1:11434/v1", apiKey: "k" },
    });
    expect(res.status).toBe(400);
  });

  it("keeps the platform default admin-only", async () => {
    const body = { provider: "openai", model: "gpt", apiKey: "sk-platform-000000" };
    expect((await api("/signal/platform-config", { method: "PUT", token: alice.apiKey, body })).status).toBe(403);
  });

  it("asks for a model before chatting", async () => {
    const res = await chat([user("hi")], bob.apiKey);
    expect(res.status).toBe(409);
  });
});

describe("connection test", () => {
  it("works with thinking models that reject a forced tool_choice", async () => {
    await configure();
    fetchMock
      .get(LLM)
      .intercept({ path: "/v1/chat/completions", method: "POST" })
      .reply((request) => {
        const body = JSON.parse(String(request.body));
        if (body.tool_choice === "required" || typeof body.tool_choice === "object") {
          return {
            statusCode: 400,
            data: JSON.stringify({ error: { message: "Thinking mode does not support this tool_choice" } }),
          };
        }
        return {
          statusCode: 200,
          responseOptions: { headers: { "content-type": "application/json" } },
          data: JSON.stringify({
            id: "c1",
            object: "chat.completion",
            created: 1,
            model: "m",
            choices: [
              {
                index: 0,
                finish_reason: "tool_calls",
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [{ id: "call_ping", type: "function", function: { name: "ping", arguments: "{}" } }],
                },
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          }),
        };
      });
    const res = await api("/signal/config/test", { method: "POST", token: alice.apiKey });
    expect(data(res)).toMatchObject({ ok: true, toolCalling: true });
  });
});

describe("chat with approvals (REDESIGN §5.3–5.5)", () => {
  it("pauses writes for approval, then executes once approved", async () => {
    await configure();
    mockToolCall("create_endpoint", { path: "/ai/note.txt", type: "static", content: "hello from signal" });
    const first = await chat([user("建一个 /ai/note.txt")]);
    const pending = toolParts(first.message);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ type: "tool-create_endpoint", state: "approval-requested" });
    expect(await endpointPaths()).not.toContain("/ai/note.txt");

    mockText("已创建草稿。");
    const approved = approve(first.message!, true);
    const second = await chat([user("建一个 /ai/note.txt"), approved], alice.apiKey, approved);
    const done = toolParts(second.message).find((part) => part.type === "tool-create_endpoint");
    expect(done).toMatchObject({ state: "output-available", output: { path: "/ai/note.txt", status: "draft" } });
    expect(await endpointPaths()).toContain("/ai/note.txt");

    const audit = await env.DB.prepare("SELECT source, tool, ok FROM agent_actions").all();
    expect(audit.results).toEqual([{ source: "signal", tool: "create_endpoint", ok: 1 }]);
  });

  it("does not execute a denied action", async () => {
    await configure();
    mockToolCall("delete_endpoint", { path: "/hello" });
    const first = await chat([user("删掉 /hello")]);
    mockText("好的，不删除。");
    await chat([user("删掉 /hello"), approve(first.message!, false)]);
    expect(await endpointPaths()).toContain("/hello");
  });

  it("runs read-only tools immediately and redacts secrets", async () => {
    await configure();
    mockToolCall("list_access_keys", { group: "VIP" });
    mockText("VIP 组有 3 张通行卡。");
    const res = await chat([user("VIP 有哪些通行卡")]);
    const read = toolParts(res.message)[0];
    expect(read.state).toBe("output-available");
    expect(res.raw).not.toContain(ALICE_KEY);
    expect(JSON.stringify(read.output)).toContain("ep-…1111");
  });
});
