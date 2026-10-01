/**
 * Secrets never reach a model or an MCP client through tool output
 * (docs/REDESIGN.md §5.5): endpoint access keys and management keys are
 * masked wherever they appear, including inside strings.
 */
const EP_KEY = /ep-[a-f0-9]{32}/g;
const SEC_KEY = /sec-[a-f0-9]{64}/g;

export const maskAccessKey = (key: string) => `ep-…${key.slice(-4)}`;

export function redact<T>(value: T): T {
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return node.replace(EP_KEY, maskAccessKey).replace(SEC_KEY, "sec-…(hidden)");
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node)
          .filter(([key]) => key !== "apiKey" && key !== "platformApiKey")
          .map(([key, child]) => [key, walk(child)]),
      );
    }
    return node;
  };
  return walk(value) as T;
}

/** Wraps untrusted endpoint content so models treat it as data, not instructions. */
export function asData(content: string, limit = 4000) {
  const truncated = content.length > limit;
  return {
    data: `<data>\n${truncated ? content.slice(0, limit) : content}\n</data>`,
    truncated,
    length: content.length,
  };
}
