import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageStreamWriter } from "ai";
import { buildEndpointAccessUrl } from "../../utils/endpointShare";
import { DEMO_ORIGIN, DEMO_USER, demoState, ops } from "./backend";

/**
 * Scripted Signal for the demo: recognises a few requests and answers with
 * the same stream protocol as the real agent (src/routes/signal.ts) — tool
 * calls, approval requests, then execution once the visitor approves. No
 * model is called.
 */
type Input = Record<string, unknown>;
type Step = { tool: string; input: Input };
type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Input;
  approval?: { id: string; approved?: boolean };
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const id = () => crypto.randomUUID().slice(0, 12);
const normalize = (path: string) => `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

async function say(writer: UIMessageStreamWriter, text: string) {
  const textId = id();
  writer.write({ type: "text-start", id: textId });
  for (const piece of text.match(/[\s\S]{1,6}/g) ?? []) {
    writer.write({ type: "text-delta", id: textId, delta: piece });
    await pause(28);
  }
  writer.write({ type: "text-end", id: textId });
}

function findPath(text: string) {
  return text.match(/\/[a-zA-Z0-9\-_/.]*[a-zA-Z0-9\-_.]/)?.[0];
}

function findGroup(text: string) {
  const groups = demoState().groups;
  return groups.find((group) => text.includes(group.name)) ?? groups[0];
}

/** Turns the visitor's sentence into a plan, or a reply when nothing matches. */
function plan(text: string): { reply: string; steps: Step[]; read?: boolean } {
  const path = findPath(text);
  const existing = path ? demoState().endpoints.find((endpoint) => endpoint.path === normalize(path)) : undefined;

  if (/通行卡|密钥|key|签发/i.test(text)) {
    const group = findGroup(text);
    if (!group) return { reply: "还没有权限组。先说「新建一个叫 测试 的权限组」试试？", steps: [] };
    const days = Number(text.match(/(\d+)\s*天/)?.[1] ?? 30);
    return {
      reply: `好的，我会在「${group.name}」里签发一张 ${days} 天有效的通行卡：`,
      steps: [{ tool: "issue_access_key", input: { group: group.name, note: "Signal 演示签发", expiresInDays: days } }],
    };
  }
  if (/删除|删掉/.test(text)) {
    if (!existing) return { reply: "要删除哪个端点？带上它的路径，例如「删除 /docs/changelog.md」。", steps: [] };
    return { reply: `删除不可恢复，请确认：`, steps: [{ tool: "delete_endpoint", input: { path: existing.path } }] };
  }
  if (/下线|取消发布/.test(text)) {
    if (!existing) return { reply: "要下线哪个端点？带上路径，例如「下线 /api/weather」。", steps: [] };
    return { reply: "下线后链接会立即返回 404：", steps: [{ tool: "unpublish_endpoint", input: { path: existing.path } }] };
  }
  if (/创建|新建|建一个|加一个|做一个|写一个/.test(text)) {
    const target = normalize(path ?? (/json/i.test(text) ? "/hello.json" : "/hello"));
    if (demoState().endpoints.some((endpoint) => endpoint.path === target)) {
      return { reply: `${target} 已经存在了，换一个路径吧，例如「新建 /notes/today 并发布」。`, steps: [] };
    }
    const asJson = /json/i.test(text) || target.endsWith(".json");
    const steps: Step[] = [
      {
        tool: "create_endpoint",
        input: {
          path: target,
          type: "static",
          access: "public",
          contentType: asJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
          content: asJson
            ? JSON.stringify({ message: "Hello from the edge", createdBy: "Signal" }, null, 2)
            : "Hello from the edge 👋\n",
        },
      },
    ];
    if (/发布|上线/.test(text)) steps.push({ tool: "publish_endpoint", input: { path: target } });
    return { reply: `计划如下，确认后执行${steps.length > 1 ? "；新端点会先以草稿创建再发布" : "（以草稿创建）"}：`, steps };
  }
  if (/发布|上线/.test(text)) {
    if (!existing) return { reply: "要发布哪个端点？带上路径，例如「发布 /configs/flags.json」。", steps: [] };
    return { reply: "发布后即可在边缘访问：", steps: [{ tool: "publish_endpoint", input: { path: existing.path } }] };
  }
  if (/有哪些|列出|看看|状态|概况|总结|多少/.test(text)) {
    return { reply: "", steps: [{ tool: "list_endpoints", input: {} }], read: true };
  }
  return {
    reply:
      "这是演示版 Signal，只认识几种说法。试试：\n\n- 「新建 /hello.json 并发布」\n- 「给 合作伙伴 签发一张 7 天的通行卡」\n- 「看看我有哪些端点」\n\n部署自己的实例并接入模型后，Signal 能理解任意描述。",
    steps: [],
  };
}

/** Executes one approved step against the demo backend; mirrors the server tool results. */
function run(step: Step): unknown {
  const endpoints = demoState().endpoints;
  const byPath = (path: unknown) => {
    const endpoint = endpoints.find((candidate) => candidate.path === normalize(String(path ?? "")));
    if (!endpoint) throw new Error(`没有找到端点 ${String(path)}`);
    return endpoint;
  };
  const status = (endpoint: { isPublished: boolean; enabled: boolean }) =>
    !endpoint.enabled ? "disabled" : endpoint.isPublished ? "live" : "draft";
  const input = step.input;

  switch (step.tool) {
    case "list_endpoints":
      return { endpoints: endpoints.map((endpoint) => ({ path: endpoint.path, type: endpoint.type, status: status(endpoint) })) };
    case "create_endpoint": {
      const path = normalize(String(input.path));
      const created = ops.createEndpoint({
        path,
        name: path.split("/").filter(Boolean).pop() ?? path,
        type: "static",
        config: { content: input.content, contentType: input.contentType },
        parentId: endpoints.find((endpoint) => path.startsWith(`${endpoint.path}/`) && endpoint.type !== "dynamicProxy")?.id ?? null,
      });
      return { path: created.path, status: "draft" };
    }
    case "publish_endpoint":
      return { path: ops.setPublished(byPath(input.path).id, true).path, status: "live" };
    case "unpublish_endpoint":
      return { path: ops.setPublished(byPath(input.path).id, false).path, status: "draft" };
    case "delete_endpoint": {
      const endpoint = byPath(input.path);
      ops.deleteEndpoint(endpoint.id);
      return { path: endpoint.path, status: "deleted" };
    }
    case "issue_access_key": {
      const group = demoState().groups.find((candidate) => candidate.name === input.group) ?? demoState().groups[0];
      const days = Number(input.expiresInDays ?? 30);
      const key = ops.issueKey(group.id, {
        description: String(input.note ?? ""),
        expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(),
      });
      return { group: group.name, key: `ep-…${key.keyValue.slice(-4)}`, expiresAt: key.expiresAt };
    }
    default:
      throw new Error("演示版 Signal 不支持这个操作");
  }
}

function wrapUp(results: { step: Step; output?: unknown; error?: string; denied?: boolean }[]) {
  const done = results.filter((result) => !result.error && !result.denied);
  if (!done.length) return results.some((result) => result.denied) ? "好的，已取消，什么都没有改动。" : "执行失败了，看看上面的错误信息。";
  const published = done.find((result) => result.step.tool === "publish_endpoint");
  if (published) {
    const url = buildEndpointAccessUrl(DEMO_ORIGIN, DEMO_USER.username, String((published.output as { path: string }).path));
    return `完成。端点已经上线：\n\n\`${url}\`\n\n在端点详情的「分享」里可以模拟访问，或者生成通行卡片。`;
  }
  if (done.some((result) => result.step.tool === "issue_access_key")) return "已签发。完整密钥只在「访问」页面可见，Signal 不会把它交给模型。";
  if (done.some((result) => result.step.tool === "create_endpoint")) return "已创建草稿。说「发布」就能让它上线。";
  return "完成。";
}

async function respond(writer: UIMessageStreamWriter, messages: UIMessage[]) {
  const last = messages[messages.length - 1];
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });

  // Continuation: the visitor answered the approval requests.
  if (last?.role === "assistant") {
    const answered = (last.parts as unknown as ToolPart[]).filter(
      (part) => part.type.startsWith("tool-") && part.state === "approval-responded",
    );
    const results = [];
    for (const part of answered) {
      const step = { tool: part.type.slice(5), input: part.input ?? {} };
      if (!part.approval?.approved) {
        writer.write({ type: "tool-output-denied", toolCallId: part.toolCallId });
        results.push({ step, denied: true });
        continue;
      }
      await pause(260);
      try {
        const output = run(step);
        ops.log(step.tool, step.input, true, null);
        writer.write({ type: "tool-output-available", toolCallId: part.toolCallId, output });
        results.push({ step, output });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ops.log(step.tool, step.input, false, message);
        writer.write({ type: "tool-output-error", toolCallId: part.toolCallId, errorText: message });
        results.push({ step, error: message });
      }
    }
    await say(writer, wrapUp(results));
  } else {
    const text = (last?.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join(" ");
    await pause(450);
    const { reply, steps, read } = plan(text);
    if (reply) await say(writer, reply);
    for (const step of steps) {
      const toolCallId = id();
      writer.write({ type: "tool-input-available", toolCallId, toolName: step.tool, input: step.input });
      if (read) {
        const output = run(step) as { endpoints: { status: string }[] };
        writer.write({ type: "tool-output-available", toolCallId, output });
        const count = (status: string) => output.endpoints.filter((endpoint) => endpoint.status === status).length;
        await say(
          writer,
          `你有 ${output.endpoints.length} 个端点：${count("live")} 个在线，${count("draft")} 个草稿，${count("disabled")} 个已停用。点击上方的星图节点可以查看详情。`,
        );
      } else {
        writer.write({ type: "tool-approval-request", approvalId: id(), toolCallId });
      }
    }
  }

  writer.write({ type: "finish-step" });
  writer.write({ type: "finish" });
}

export function chatResponse(body: Record<string, unknown>, signal?: AbortSignal) {
  const messages = (body.messages as UIMessage[] | undefined) ?? [];
  const stream = createUIMessageStream({
    // Keeps the message id, so an approval continues the same assistant message.
    originalMessages: messages,
    execute: async ({ writer }) => {
      if (signal?.aborted) return;
      await respond(writer, messages);
    },
  });
  return createUIMessageStreamResponse({ stream });
}
