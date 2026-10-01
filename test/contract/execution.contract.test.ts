import { env, fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  alice,
  ALICE_EXPIRED_KEY,
  ALICE_KEY,
  ALICE_REVOKED_KEY,
  BOB_KEY,
  call,
  contract,
  ORIGIN,
  seed,
} from "./helpers";
import { SELF } from "cloudflare:test";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
beforeEach(seed);
afterEach(() => fetchMock.assertNoPendingInterceptors());

const usage = async (id: string) =>
  (await env.DB.prepare("SELECT usage_count FROM access_keys WHERE id = ?").bind(id).first<{ usage_count: number }>())!
    .usage_count;

/** Echo upstream: replies with what it received, so forwarding rules are frozen. */
const echo = (origin: string, path: string, method = "GET") =>
  fetchMock
    .get(origin)
    .intercept({ path, method })
    .reply(
      200,
      (opts) => {
        const headers = Object.fromEntries(
          Object.entries((opts.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
        );
        return JSON.stringify({
          path: opts.path,
          method: opts.method,
          forwarded: {
            "x-upstream": headers["x-upstream"] ?? null,
            "x-client": headers["x-client"] ?? null,
            "x-access-key": headers["x-access-key"] ?? null,
            authorization: headers["authorization"] ?? null,
            host: headers["host"] ?? null,
          },
        });
      },
      { headers: { "content-type": "application/json", "x-from-upstream": "yes" } },
    );

describe("static endpoints (REDESIGN §1.3)", () => {
  it("serves public content with charset and custom headers", async () => {
    const response = await SELF.fetch(`${ORIGIN}/e/alice/hello`);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("X-Custom")).toBe("yes");
    expect(await response.text()).toBe("hello world");
  });

  it("keeps an explicit charset", async () => {
    const response = await SELF.fetch(`${ORIGIN}/e/alice/configs/app.yaml`);
    expect(response.headers.get("Content-Type")).toBe("text/yaml; charset=utf-8");
  });

  it("answers any method", async () => {
    const response = await SELF.fetch(`${ORIGIN}/e/alice/hello`, { method: "POST", body: "x" });
    expect(response.status).toBe(200);
  });

  it("isolates namespaces by username", async () => {
    expect(await (await SELF.fetch(`${ORIGIN}/e/bob/hello`)).text()).not.toBe("hello world");
  });
});

describe("resolution errors use { error } bodies", () => {
  it.each([
    ["unknown user", "/e/nobody/hello"],
    ["unactivated owner", "/e/bob/hello"],
    ["unknown path", "/e/alice/missing"],
    ["draft endpoint", "/e/alice/draft"],
    ["disabled endpoint", "/e/alice/disabled"],
    ["trailing slash is a different path", "/e/alice/hello/"],
    ["static endpoints are not prefix-matched", "/e/alice/hello/more"],
  ])("%s", async (_label, path) => {
    await contract(call(path));
  });
});

describe("protected endpoints: X-Access-Key header or access_key query", () => {
  it("requires a key", async () => {
    expect((await contract(call("/e/alice/configs/secret"))).status).toBe(401);
  });

  it("accepts the X-Access-Key header and counts usage", async () => {
    const res = await contract(call("/e/alice/configs/secret", { headers: { "X-Access-Key": ALICE_KEY } }));
    expect(res.status).toBe(200);
    expect(await usage("key_alice")).toBe(1);
  });

  it("accepts the access_key query parameter", async () => {
    const res = await contract(call(`/e/alice/configs/secret?access_key=${ALICE_KEY}`));
    expect(res.status).toBe(200);
  });

  it("does not accept Authorization: Bearer ep- or ?token=", async () => {
    expect((await call("/e/alice/configs/secret", { token: ALICE_KEY })).status).toBe(401);
    expect((await call(`/e/alice/configs/secret?token=${ALICE_KEY}`)).status).toBe(401);
  });

  it.each([
    ["expired key", ALICE_EXPIRED_KEY],
    ["revoked key", ALICE_REVOKED_KEY],
    ["key from another group", BOB_KEY],
    ["unknown key", `ep-${"9".repeat(32)}`],
  ])("rejects %s", async (_label, key) => {
    const res = await contract(call("/e/alice/configs/secret", { headers: { "X-Access-Key": key } }));
    expect(res.status).toBe(403);
  });

  it("reports a protected endpoint without groups as a server error", async () => {
    await contract(call("/e/alice/broken", { headers: { "X-Access-Key": ALICE_KEY } }));
  });
});

describe("proxy endpoints", () => {
  it("forwards to the fixed target without the query string", async () => {
    echo("https://upstream.test", "/data.json");
    const response = await SELF.fetch(`${ORIGIN}/e/alice/proxy/fixed?ignored=1`, {
      headers: { "X-Client": "c", Authorization: "Bearer client-token" },
    });
    expect(response.headers.get("x-from-upstream")).toBe("yes");
    expect(await response.json()).toMatchSnapshot();
  });

  it("forwards the method", async () => {
    echo("https://upstream.test", "/data.json", "POST");
    const response = await SELF.fetch(`${ORIGIN}/e/alice/proxy/fixed`, { method: "POST", body: "payload" });
    expect(((await response.json()) as { method: string }).method).toBe("POST");
  });

  it("reports upstream failures", async () => {
    fetchMock.get("https://upstream.test").intercept({ path: "/data.json" }).replyWithError(new Error("boom"));
    const res = await call("/e/alice/proxy/fixed");
    expect(res.status).toBe(502);
    expect((res.body as { error: string }).error).toBe("Proxy error");
  });
});

describe("dynamicProxy endpoints", () => {
  it("maps the sub-path onto baseUrl and forwards the query without access_key", async () => {
    echo("https://raw.upstream.test", "/owner/repo/main/file.txt?x=1");
    const response = await SELF.fetch(`${ORIGIN}/e/alice/gh/owner/repo/main/file.txt?x=1&access_key=${ALICE_KEY}`, {
      headers: { "X-Client": "c", "X-Access-Key": ALICE_KEY, Authorization: "Bearer client-token" },
    });
    expect(await response.json()).toMatchSnapshot();
  });

  it("serves the endpoint root itself", async () => {
    echo("https://raw.upstream.test", "/");
    expect((await SELF.fetch(`${ORIGIN}/e/alice/gh`)).status).toBe(200);
  });

  it("does not match a sibling that merely shares the prefix", async () => {
    await contract(call("/e/alice/ghost"));
  });
});

describe("platform credentials never reach an upstream (changed in the redesign)", () => {
  const forwardedAuthorization = async (
    path: string,
    upstreamPath: string,
    authorization: string,
    origin = "https://upstream.test",
  ) => {
    echo(origin, upstreamPath);
    const response = await SELF.fetch(`${ORIGIN}${path}`, { headers: { Authorization: authorization } });
    return ((await response.json()) as { forwarded: { authorization: string | null } }).forwarded.authorization;
  };

  it.each([
    ["a management key", `Bearer ${alice.apiKey}`],
    ["an endpoint access key", `Bearer ${ALICE_KEY}`],
    ["a browser session", `Bearer ${alice.session}`],
    ["an expired browser session", "Bearer session-alice-expired"],
  ])("strips %s on fixed proxies", async (_label, authorization) => {
    expect(await forwardedAuthorization("/e/alice/proxy/fixed", "/data.json", authorization)).toBeNull();
  });

  it("strips a management key on dynamic proxies", async () => {
    expect(
      await forwardedAuthorization(
        "/e/alice/gh/a.txt",
        "/a.txt",
        `Bearer ${alice.apiKey}`,
        "https://raw.upstream.test",
      ),
    ).toBeNull();
  });

  it.each([
    ["an unrelated bearer token", "Bearer client-token"],
    ["basic auth", "Basic dXNlcjpwYXNz"],
  ])("still forwards %s", async (_label, authorization) => {
    expect(await forwardedAuthorization("/e/alice/proxy/fixed", "/data.json", authorization)).toBe(authorization);
  });

  it("keeps an Authorization header configured by the endpoint owner", async () => {
    await env.DB.prepare("UPDATE endpoints SET config = ? WHERE id = ?")
      .bind(
        JSON.stringify({
          targetUrl: "https://upstream.test/data.json",
          headers: { authorization: "Bearer upstream-secret" },
        }),
        "ep_proxy",
      )
      .run();
    expect(await forwardedAuthorization("/e/alice/proxy/fixed", "/data.json", `Bearer ${alice.apiKey}`)).toBe(
      "Bearer upstream-secret",
    );
  });
});
