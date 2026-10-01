import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import { TypeGlyph } from "../../design/glyphs";
import { cn } from "../../lib/cn";
import { CopyButton } from "../../ui/copy-button";

const SECTIONS = [
  { id: "quick-start", title: "快速开始" },
  { id: "addresses", title: "地址与匹配" },
  { id: "types", title: "端点类型" },
  { id: "access", title: "访问控制" },
  { id: "publishing", title: "发布与激活" },
  { id: "errors", title: "错误响应" },
  { id: "management", title: "管理 API 与 CLI" },
  { id: "signal", title: "Signal 与 MCP" },
  { id: "security", title: "安全须知" },
];

function useOrigin() {
  const [origin, setOrigin] = useState("https://ep.nekro.ai");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

export function DocsPage() {
  const { user } = useAuth();
  const origin = useOrigin();
  const name = user?.username ?? "alice";
  const active = useActiveSection();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="文档目录" className="hidden lg:block">
        <div className="sticky top-24 grid gap-0.5 text-sm">
          <div className="mb-3 font-mono text-xs text-ink-4">文档</div>
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "relative rounded-sm px-3 py-1.5 text-ink-3 hover:text-ink-1",
                active === section.id && "text-ink-1 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-signal",
              )}
            >
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <article className="min-w-0 max-w-3xl">
        <header className="mb-12">
          <div className="mb-3 font-mono text-xs text-signal">使用文档</div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Endpoints 使用指南</h1>
          <p className="mt-4 text-base leading-relaxed text-ink-2">
            在边缘发布静态内容和代理端点，用权限组与通行卡控制访问。本页描述的行为均有自动化契约测试保证。
          </p>
        </header>

        <Section id="quick-start" title="快速开始">
          <ol className="grid gap-4">
            {[
              ["使用 GitHub 登录", "首次登录会自动创建账号，并生成一把管理密钥。"],
              ["新建端点", "在「端点」中按 N，选择类型、填写地址。新端点以草稿创建。"],
              ["编辑内容并保存", "⌘S 保存。已发布端点保存后立即在线上生效。"],
              ["发布", "账号由管理员激活后即可发布。发布后通过下方地址访问。"],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs text-ink-2">{index + 1}</span>
                <div>
                  <div className="font-medium">{title}</div>
                  <p className="mt-0.5 text-sm text-ink-3">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Code>{`${origin}/e/${name}/<路径>`}</Code>
          {!user && <P>登录后，上面的示例会换成你自己的用户名。</P>}
        </Section>

        <Section id="addresses" title="地址与匹配">
          <P>
            每个用户拥有自己的命名空间 <Inline>/e/&lt;用户名&gt;</Inline>，端点路径挂在其下。路径只能包含字母、数字以及 <Inline>- _ . /</Inline>，目录由路径前缀自然形成。
          </P>
          <List
            items={[
              <>静态和固定代理端点只做<strong>精确匹配</strong>：<Inline>/hello</Inline> 与 <Inline>/hello/</Inline> 是不同的地址。</>,
              <>动态代理端点匹配自身以及<strong>所有子路径</strong>；多个动态代理重叠时取最长前缀。</>,
              <>精确匹配优先：在动态代理 <Inline>/gh</Inline> 之下再建一个 <Inline>/gh/readme</Inline>，该地址由后者响应。</>,
              <>只有已发布的端点参与匹配；草稿对外不存在。</>,
            ]}
          />
        </Section>

        <Section id="types" title="端点类型">
          <TypeBlock type="static" title="静态">
            <P>原样返回保存的内容。可以指定任意 Content-Type，未带 charset 时自动补上 <Inline>charset=utf-8</Inline>；可附加自定义响应头。</P>
          </TypeBlock>
          <TypeBlock type="proxy" title="代理">
            <P>每次请求都转发到一个固定的目标 URL。请求方法、请求体与请求头会一并转发：</P>
            <List
              items={[
                <>
                  总会移除 <Inline>Host</Inline> 和 <Inline>X-Access-Key</Inline>；其余请求头（包括 <Inline>Authorization</Inline>）原样转发，可配置追加或移除。
                </>,
                <>访问时携带的查询参数<strong>不会</strong>转发。</>,
                <>超时可设 1–30 秒；超时返回 504，上游不可达返回 502。</>,
              ]}
            />
          </TypeBlock>
          <TypeBlock type="dynamicProxy" title="动态代理">
            <P>把子路径拼接到基础 URL 之后转发，适合为整站静态资源提供统一入口：</P>
            <Code>{`${origin}/e/${name}/gh/owner/repo/main/README.md\n→ https://raw.githubusercontent.com/owner/repo/main/README.md`}</Code>
            <List
              items={[
                <>查询参数会转发，但会去掉 <Inline>access_key</Inline>。</>,
                <>可设置路径白名单（支持 <Inline>*</Inline>），不在名单内返回 403。</>,
                <>出于安全考虑，基础 URL 不能指向内网或本机地址，否则返回 403。</>,
              ]}
            />
          </TypeBlock>
          <TypeBlock type="script" title="脚本（即将推出）">
            <P>可以创建并保存脚本，但目前访问会返回 501。</P>
          </TypeBlock>
        </Section>

        <Section id="access" title="访问控制">
          <P>
            端点可以是<strong>公开</strong>或<strong>受保护</strong>的。受保护端点只接受其关联权限组签发、未过期且未吊销的通行卡（<Inline>ep-</Inline> 开头的密钥），两种携带方式：
          </P>
          <Code>{`curl -H "X-Access-Key: ep-你的通行卡" \\\n  ${origin}/e/${name}/configs/app.json`}</Code>
          <Code>{`curl "${origin}/e/${name}/configs/app.json?access_key=ep-你的通行卡"`}</Code>
          <P>
            <Inline>Authorization: Bearer ep-…</Inline> 和 <Inline>?token=</Inline> <strong>不被接受</strong>。每次成功访问都会记录通行卡的使用次数和最近使用时间。
          </P>
          <P>在端点的「分享」页可以为选中的通行卡生成带密钥的链接、二维码和可下载的通行卡图片；二维码完全在浏览器本地生成。</P>
        </Section>

        <Section id="publishing" title="发布与激活">
          <List
            items={[
              "新账号默认未激活：可以创建、编辑端点和管理权限组，但不能发布。",
              "管理员激活后即可发布；取消发布、停用不受激活限制。",
              "停用会让端点返回 503，同时保留发布状态，适合临时下线。",
              "所有者账号被停用时，其全部端点返回 403。",
            ]}
          />
        </Section>

        <Section id="errors" title="错误响应">
          <P>
            端点访问层（<Inline>/e/*</Inline>）的错误响应体为 <Inline>{'{"error": "…"}'}</Inline>：
          </P>
          <div className="scrollbar-thin overflow-x-auto rounded-md shadow-[inset_0_0_0_1px_var(--line)]">
            <table className="w-full text-left text-sm">
              <thead className="text-2xs tracking-wide text-ink-4 uppercase">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">状态码</th>
                  <th className="py-2 font-medium">error</th>
                  <th className="py-2 pr-4 font-medium">原因</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["404", "User not found", "用户名不存在"],
                  ["403", "User not activated", "所有者账号未激活"],
                  ["404", "Endpoint not found", "路径不存在或未发布"],
                  ["503", "Endpoint disabled", "端点已停用"],
                  ["401", "Access key required", "受保护端点未携带通行卡"],
                  ["403", "Invalid or expired access key", "通行卡无效、过期、已吊销或不属于关联权限组"],
                  ["500", "No permission groups configured", "受保护端点没有关联任何权限组"],
                  ["403", "Path not allowed", "动态代理路径不在白名单内"],
                  ["502 / 504", "Proxy error / Proxy timeout", "上游不可达 / 超时"],
                  ["501", "Script endpoints not yet supported", "脚本端点尚未开放"],
                ].map(([status, error, reason]) => (
                  <tr key={error} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-ink-2">{status}</td>
                    <td className="py-2 font-mono text-xs text-ink-1">{error}</td>
                    <td className="py-2 pr-4 text-xs text-ink-3">{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="management" title="管理 API 与 CLI">
          <P>
            控制台的所有操作都通过 <Inline>/api/*</Inline> 完成，可用浏览器会话或<strong>管理密钥</strong>（<Inline>sec-</Inline> 开头，在「设置」中查看）鉴权：
          </P>
          <Code>{`curl -H "Authorization: Bearer sec-你的管理密钥" \\\n  "${origin}/api/endpoints?view=flat&includeDisabled=true"`}</Code>
          <P>
            仓库自带的 <Inline>epctl</Inline> 基于这套接口提供拉取、比对、推送、发布与回滚，凭据保存在仓库之外：
          </P>
          <Code>{`pnpm ep init --base-url ${origin}\npnpm ep list\npnpm ep pull /configs/app.json`}</Code>
          <P>
            完整的接口说明见 <a href="/doc" className="text-signal hover:underline">/doc</a>（OpenAPI，由 <Inline>/api/doc</Inline> 生成）。
          </P>
        </Section>

        <Section id="signal" title="Signal 与 MCP">
          <P>
            在「设置」中接入你自己的模型（Anthropic、OpenAI 或任何 OpenAI 兼容服务）后，工作区底部的输入条就可以用自然语言管理端点。查询会直接执行；新建、修改、发布、删除等操作会先列成计划，并在列表和星图上以虚线预览，逐项确认后才执行。
          </P>
          <P>同一套工具也通过 MCP（Streamable HTTP）开放，任何支持 MCP 的客户端都可以用管理密钥连接：</P>
          <Code>{`claude mcp add --transport http endpoints ${origin}/mcp \
  --header "Authorization: Bearer sec-你的管理密钥"`}</Code>
          <List
            items={[
              "工具输出中的通行卡和管理密钥一律脱敏，只显示尾号；完整的带密钥链接请在「分享」页生成。",
              <>端点内容以 <Inline>&lt;data&gt;</Inline> 包裹交给模型，只作为数据，不会被当作指令。</>,
              "工具调用走与管理 API 完全相同的鉴权与激活检查，并记录在「设置」的调用记录中。",
            ]}
          />
        </Section>

        <Section id="security" title="安全须知">
          <List
            items={[
              <>管理密钥等同于你的账号权限，只用于 <Inline>/api/*</Inline>，绝不要放进分享链接或订阅地址。</>,
              "通行卡只对端点访问有效，可以随时吊销；为不同的人签发不同的卡，便于单独收回。",
              "带密钥的链接被转发出去，任何拿到它的人都能访问——需要收回时吊销对应的通行卡。",
              <>代理会把客户端的 <Inline>Authorization</Inline> 头转发给上游；不要用管理密钥去访问代理端点。</>,
            ]}
          />
        </Section>
      </article>
    </div>
  );
}

function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="group mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight">
        {title}
        <a href={`#${id}`} aria-label={`链接到「${title}」`} className="font-mono text-sm text-ink-4 opacity-0 group-hover:opacity-100">
          #
        </a>
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink-2 md:text-base md:leading-relaxed">{children}</p>;
}

function Inline({ children }: { children: ReactNode }) {
  return <code className="rounded-[4px] bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-ink-1">{children}</code>;
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink-2 md:text-base">
          <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-4" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="scrollbar-thin overflow-x-auto rounded-md bg-surface-1 p-4 pr-12 font-mono text-xs leading-relaxed text-ink-1 shadow-[inset_0_0_0_1px_var(--line)]">
        {children}
      </pre>
      <CopyButton value={children} label="复制" className="absolute top-2.5 right-2.5" />
    </div>
  );
}

function TypeBlock({ type, title, children }: { type: "static" | "proxy" | "dynamicProxy" | "script"; title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-lg bg-surface-0 p-5 shadow-[inset_0_0_0_1px_var(--line)]">
      <h3 className="flex items-center gap-2 font-medium">
        <span className={cn("grid size-7 place-items-center rounded-md", type === "proxy" || type === "dynamicProxy" ? "bg-route-soft text-route" : "bg-surface-2 text-ink-1")}>
          <TypeGlyph type={type} className="size-3.5" />
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}
