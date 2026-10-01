import { ArrowRight, BookOpen, KeyRound, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { BrandMark } from "../../design/brand";
import { GitHubMark } from "../../design/github";
import { TypeGlyph, typeMeta } from "../../design/glyphs";
import { glide, ignite } from "../../design/motion";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/button";

function useHost() {
  const [host, setHost] = useState("ep.nekro.ai");
  useEffect(() => setHost(window.location.host), []);
  return host;
}

export function LandingPage() {
  return (
    <>
      <Hero />
      <Demo />
      <Capabilities />
      <AccessModel />
      <ClosingCta />
    </>
  );
}

function PrimaryCta({ size = "lg" }: { size?: "lg" | "md" }) {
  const { isAuthenticated, login, isLoginLoading } = useAuth();
  return isAuthenticated ? (
    <Button asChild size={size} variant="primary">
      <Link to="/app">
        进入控制台 <ArrowRight />
      </Link>
    </Button>
  ) : (
    <Button size={size} variant="primary" onClick={login} disabled={isLoginLoading}>
      <GitHubMark /> 使用 GitHub 开始
    </Button>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-20 md:px-8 lg:min-h-[78vh] lg:grid-cols-[1.05fr_1fr] lg:pt-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={glide}>
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-1 px-3 py-1 font-mono text-xs text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)]">
            <span className="size-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--signal)]" />
            /e/you/anything
          </span>
          <h1 className="mt-6 text-[clamp(40px,6vw,68px)] leading-[1.05] font-semibold tracking-tight">
            在边缘
            <br />
            布下你的<span className="text-brand">端点</span>
          </h1>
          <p className="mt-6 max-w-xl text-md leading-relaxed text-ink-2">
            托管一段配置、把请求转发到任何地方，再用通行卡决定谁能访问。一个稳定的地址，由全球边缘节点就近响应。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta />
            <Button asChild size="lg" variant="ghost">
              <Link to="/docs">
                <BookOpen /> 阅读文档
              </Link>
            </Button>
          </div>
          <p className="mt-8 font-mono text-xs text-ink-4">Cloudflare Workers · D1 · 开源，可自托管</p>
        </motion.div>
        <SignalField />
      </div>
    </section>
  );
}

const ORBIT = [
  { label: "/configs/app.json", angle: -62, r: 150, type: "static" as const, locked: true },
  { label: "/gh/*", angle: 50, r: 118, type: "dynamicProxy" as const, host: "raw.githubusercontent.com" },
  { label: "/api/weather", angle: 128, r: 150, type: "proxy" as const, locked: true },
  { label: "/hello", angle: 190, r: 160, type: "static" as const },
  { label: "/notes.md", angle: 246, r: 118, type: "static" as const, draft: true },
];

/** Hero illustration: the namespace map in miniature. Draws in once, then idles. */
function SignalField() {
  const cx = 230;
  const cy = 230;
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...glide, delay: 0.1 }}
      className="relative mx-auto aspect-square w-full max-w-[520px]"
      aria-hidden
    >
      <div className="absolute inset-[18%] rounded-full bg-signal-soft blur-3xl" />
      <svg viewBox="0 0 460 460" className="absolute inset-0 size-full overflow-visible">
        <motion.g
          style={{ originX: "50%", originY: "50%" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 240, repeat: Infinity, ease: "linear" }}
        >
          {[80, 140, 200].map((r, index) => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-strong)" strokeDasharray={index === 2 ? "2 6" : undefined} />
          ))}
        </motion.g>
        {ORBIT.map((node, index) => {
          const point = toXY(node.angle, node.r);
          const host = node.host ? toXY(node.angle, node.r + 64) : null;
          return (
            <g key={node.label}>
              <motion.line
                x1={cx}
                y1={cy}
                x2={point.x}
                y2={point.y}
                stroke="var(--line-strong)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
              {host && (
                <motion.line
                  x1={point.x}
                  y1={point.y}
                  x2={host.x}
                  y2={host.y}
                  stroke="var(--route)"
                  strokeOpacity={0.7}
                  strokeDasharray="4 4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface-solid shadow-[0_0_0_1px_var(--line-strong),0_0_40px_var(--signal-soft)]">
        <BrandMark className="size-8" />
      </div>
      {ORBIT.map((node, index) => {
        const point = toXY(node.angle, node.r);
        const host = node.host ? toXY(node.angle, node.r + 64) : null;
        const live = !node.draft;
        return (
          <div key={node.label}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...glide, delay: 0.55 + index * 0.08 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(point.x / 460) * 100}%`, top: `${(point.y / 460) * 100}%` }}
            >
              <span
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full bg-surface-solid py-1 pr-2.5 pl-1.5 font-mono text-[11px] whitespace-nowrap",
                  live ? "shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_45%,transparent),0_0_18px_-4px_var(--signal)]" : "outline-1 outline-ink-3 outline-dashed",
                )}
              >
                {node.locked && <span className="absolute -inset-1 rounded-full shadow-[0_0_0_1.5px_var(--pass)]" />}
                <span className={cn("grid size-4 place-items-center rounded-full", node.host || node.type === "proxy" ? "bg-route-soft text-route" : "bg-surface-3")}>
                  <TypeGlyph type={node.type} className="size-2.5" />
                </span>
                {node.label}
                <span className={cn("size-1.5 rounded-full", live ? "bg-signal" : "shadow-[inset_0_0_0_1px_var(--ink-3)]")} />
              </span>
              {index === 0 && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_2px_var(--signal),0_0_24px_var(--signal)]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.8, 1, 1.8] }}
                  transition={{ ...ignite, duration: 1, delay: 1.6 }}
                />
              )}
            </motion.div>
            {host && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-sm bg-route-soft px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-route"
                style={{ left: `${(host.x / 460) * 100}%`, top: `${(host.y / 460) * 100}%` }}
              >
                ↗ {node.host}
              </motion.span>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <div className="mb-3 font-mono text-xs tracking-wide text-signal">{eyebrow}</div>
      <h2 className="text-[clamp(26px,3.4vw,36px)] leading-tight font-semibold tracking-tight">{title}</h2>
      {children && <p className="mt-4 text-sm leading-relaxed text-ink-3 md:text-base">{children}</p>}
    </div>
  );
}

const STEPS = ["编辑", "发布", "访问"] as const;

function Demo() {
  const host = useHost();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [step, setStep] = useState(-1);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setStep(0);
    const timers = [setTimeout(() => setStep(1), 1600), setTimeout(() => setStep(2), 3000)];
    return () => timers.forEach(clearTimeout);
  }, [inView, run]);

  const content = "version: 3\nfeatures:\n  search: true\n  beta: false\n";
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="三步上线" title="写下内容，点亮它，然后把地址交出去">
          不需要服务器，也不需要部署流程。保存即生效；需要保护的端点，用通行卡把门关上。
        </SectionHeading>
        <div ref={ref} className="grid gap-4 lg:grid-cols-3">
          {/* 1 · edit */}
          <DemoPane index={0} step={step} title="编辑" hint="/configs/app.yaml">
            <pre className="font-mono text-xs leading-relaxed text-ink-2">
              {step >= 0 ? <TypedText text={content} key={run} /> : " "}
            </pre>
          </DemoPane>
          {/* 2 · publish */}
          <DemoPane index={1} step={step} title="发布" hint="一次点击">
            <div className="grid h-full place-items-center py-6">
              <div className="relative">
                <span
                  className={cn(
                    "relative flex items-center gap-2 rounded-full bg-surface-solid py-1.5 pr-3 pl-2 font-mono text-xs transition-shadow duration-500",
                    step >= 1 ? "shadow-[0_0_0_1px_color-mix(in_srgb,var(--signal)_50%,transparent),0_0_24px_-4px_var(--signal)]" : "outline-1 outline-ink-3 outline-dashed",
                  )}
                >
                  <TypeGlyph type="static" className="size-3 text-ink-2" /> app.yaml
                  <span className={cn("size-1.5 rounded-full transition-colors", step >= 1 ? "bg-signal" : "shadow-[inset_0_0_0_1px_var(--ink-3)]")} />
                </span>
                {step >= 1 &&
                  [0, 0.15].map((delay) => (
                    <motion.span
                      key={`${run}-${delay}`}
                      className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_2px_var(--signal),0_0_24px_var(--signal)]"
                      initial={{ opacity: 0.9, scale: 0.7 }}
                      animate={{ opacity: 0, scale: 2.6 }}
                      transition={{ ...ignite, delay }}
                    />
                  ))}
              </div>
              <span className={cn("mt-4 text-xs transition-colors", step >= 1 ? "text-signal" : "text-ink-4")}>{step >= 1 ? "已发布到边缘" : "草稿"}</span>
            </div>
          </DemoPane>
          {/* 3 · access */}
          <DemoPane index={2} step={step} title="访问" hint="任何 HTTP 客户端">
            <pre className="font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
              <span className="text-ink-4">$ </span>
              <span className="text-ink-1">curl -H "X-Access-Key: ep-…" \{"\n"}  https://{host}/e/alice/configs/app.yaml</span>
              {step >= 2 && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="block">
                  <span className="mt-2 block text-signal">200 OK · text/yaml</span>
                  <span className="text-ink-3">{content}</span>
                </motion.span>
              )}
            </pre>
          </DemoPane>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setRun((value) => value + 1)} disabled={step < 2}>
            <RotateCcw /> 重播
          </Button>
        </div>
      </div>
    </section>
  );
}

function DemoPane({ index, step, title, hint, children }: { index: number; step: number; title: string; hint: string; children: ReactNode }) {
  const active = step === index;
  const done = step > index;
  return (
    <div
      className={cn(
        "flex min-h-56 flex-col rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)] transition-shadow duration-500",
        active && "shadow-[inset_0_0_0_1px_var(--signal),0_0_40px_-16px_var(--signal)]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs">
        <span className={cn("grid size-5 place-items-center rounded-full font-mono text-2xs", done || active ? "bg-signal text-signal-ink" : "bg-surface-3 text-ink-3")}>
          {index + 1}
        </span>
        <span className="font-medium text-ink-1">{title}</span>
        <span className="ml-auto font-mono text-ink-4">{hint}</span>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

function TypedText({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setCount(text.length);
    const timer = setInterval(() => setCount((value) => (value >= text.length ? (clearInterval(timer), value) : value + 1)), 22);
    return () => clearInterval(timer);
  }, [text]);
  return (
    <>
      {text.slice(0, count)}
      {count < text.length && <span className="inline-block h-3.5 w-1.5 translate-y-0.5 bg-signal" />}
    </>
  );
}

function Capabilities() {
  const items = [
    { type: "static" as const, body: "JSON 或 YAML 配置、文本、Markdown。任意 Content-Type，可附带响应头。" },
    { type: "proxy" as const, body: "把一个固定的上游地址包装成你的端点，加上访问控制和统一入口。" },
    { type: "dynamicProxy" as const, body: "把整个子路径映射到目标站点，支持路径白名单，适合加速静态资源。" },
  ];
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="端点" title="三种端点，覆盖大多数需要一个地址的场景" />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map(({ type, body }, index) => (
            <motion.article
              key={type}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ ...glide, delay: index * 0.06 }}
              className="rounded-lg bg-surface-0 p-6 shadow-[inset_0_0_0_1px_var(--line)]"
            >
              <span className={cn("grid size-10 place-items-center rounded-md", type === "static" ? "bg-surface-2 text-ink-1" : "bg-route-soft text-route")}>
                <TypeGlyph type={type} className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold">{typeMeta[type].label}端点</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccessModel() {
  const nodes = [
    { icon: <ShieldCheck />, title: "权限组", body: "一类访问者，例如付费用户或团队成员。" },
    { icon: <KeyRound />, title: "通行卡", body: "组内签发的密钥，可设到期时间，随时吊销。" },
    { icon: <Lock />, title: "受保护端点", body: "只接受所关联权限组的通行卡。" },
  ];
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 md:px-8">
        <SectionHeading eyebrow="访问控制" title={<>把门关上，只把钥匙交给对的人</>}>
          通行卡通过 <code className="font-mono text-ink-1">X-Access-Key</code> 请求头或 <code className="font-mono text-ink-1">access_key</code>{" "}
          参数携带，也可以生成二维码当面分享。管理密钥与通行卡严格分离，永远不会出现在分享链接里。
        </SectionHeading>
        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {nodes.map((node, index) => (
            <div key={node.title} className="contents">
              <div className="rounded-lg bg-surface-0 p-5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--pass)_30%,transparent)]">
                <span className="text-pass [&_svg]:size-5">{node.icon}</span>
                <h3 className="mt-3 font-medium">{node.title}</h3>
                <p className="mt-1 text-sm text-ink-3">{node.body}</p>
              </div>
              {index < nodes.length - 1 && (
                <div className="hidden items-center text-pass md:flex" aria-hidden>
                  <ArrowRight className="size-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-8">
        <BrandMark className="mx-auto size-10" />
        <h2 className="mt-6 text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight">你的第一个端点，一分钟就能上线</h2>
        <p className="mt-3 text-sm text-ink-3">新账号由管理员激活后即可发布；在此之前可以先创建和编辑。</p>
        <div className="mt-8 flex justify-center gap-3">
          <PrimaryCta size="md" />
          <Button asChild variant="ghost">
            <Link to="/docs">文档</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
