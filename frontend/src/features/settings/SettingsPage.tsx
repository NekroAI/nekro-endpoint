import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Monitor, Moon, RefreshCw, ShieldAlert, Sun, Terminal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Page, PageHeader } from "../../app/Page";
import { Avatar } from "../../app/UserMenu";
import { useAppTheme, type ThemePreference } from "../../context/ThemeContextProvider";
import { useAuth } from "../../hooks/useAuth";
import { errorMessage, requestData } from "../../lib/api";
import { absoluteTime } from "../../lib/format";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useConfirm } from "../../ui/confirm";
import { CopyButton } from "../../ui/copy-button";
import { Segmented } from "../../ui/segmented";
import { toast } from "../../ui/toaster";
import { SignalSettings } from "../signal/SignalSettings";
import { ActivationCard } from "../activation/ActivationCard";

export function SettingsPage() {
  return (
    <Page className="max-w-4xl">
      <PageHeader
        eyebrow="设置"
        title="账号与偏好"
        description="管理你的账号、自动化凭据、Signal 智能助手与界面外观。"
      />
      <div className="grid gap-6">
        <AccountSection />
        <ManagementKeySection />
        <SignalSettings />
        <AppearanceSection />
        <CliSection />
      </div>
    </Page>
  );
}

function Section({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-surface-0 shadow-[inset_0_0_0_1px_var(--line)]">
      <header className="border-b border-line px-6 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function AccountSection() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Section title="账号">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-14 text-lg" ring={user.isActivated ? undefined : "caution"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-md font-semibold">{user.username}</span>
            {user.role === "admin" && <Badge tone="pass">管理员</Badge>}
            {user.isActivated ? <Badge tone="signal">已激活</Badge> : <Badge tone="caution">待激活</Badge>}
          </div>
          <div className="mt-1 text-sm text-ink-3">{user.email ?? "未公开邮箱"} · 通过 GitHub 登录</div>
          <div className="mt-1 text-xs text-ink-4">加入于 {absoluteTime(user.createdAt)}</div>
        </div>
      </div>
      <ActivationCard className="mt-5" />
    </Section>
  );
}

function ManagementKeySection() {
  const { user } = useAuth();
  const client = useQueryClient();
  const confirm = useConfirm();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const key = user.apiKey;

  const regenerate = async () => {
    const ok = await confirm({
      title: "重新生成管理密钥？",
      description: "旧密钥会立即失效。使用它的 epctl、脚本和其他外部系统需要更新为新密钥，否则会收到 401。",
      confirmLabel: "重新生成",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await requestData<{ apiKey: string }>("/auth/regenerate-key", { method: "POST" });
      await client.invalidateQueries({ queryKey: ["auth", "user"] });
      setShown(true);
      toast.success("已生成新的管理密钥", { description: "旧密钥已失效，请更新外部系统。" });
    } catch (error) {
      toast.error("重新生成失败", { description: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="管理密钥"
      icon={<ShieldAlert className="size-4 text-caution" />}
      description={
        <>
          与登录会话权限相同，用于 <code className="font-mono">Authorization: Bearer sec-…</code> 调用管理
          API。它不是端点通行卡，切勿放进分享链接。
        </>
      }
    >
      <div className="flex min-w-0 items-center gap-1 rounded-sm bg-surface-1 py-1 pr-1 pl-3 shadow-[inset_0_0_0_1px_var(--line-strong)]">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink-1">
          {shown ? key : `${key.slice(0, 8)}${"•".repeat(24)}${key.slice(-6)}`}
        </code>
        <Button size="icon-sm" variant="ghost" aria-label={shown ? "隐藏" : "显示"} onClick={() => setShown(!shown)}>
          {shown ? <EyeOff /> : <Eye />}
        </Button>
        <CopyButton value={key} label="复制管理密钥" />
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="danger" size="sm" onClick={() => void regenerate()} disabled={busy}>
          <RefreshCw className={busy ? "animate-spin" : undefined} /> 重新生成
        </Button>
      </div>
    </Section>
  );
}

function AppearanceSection() {
  const { preference, setPreference } = useAppTheme();
  return (
    <Section title="外观" description="Deep Field 适合长时间工作；Lab Paper 是明亮的工程图纸风格。">
      <Segmented<ThemePreference>
        label="主题"
        value={preference}
        onChange={setPreference}
        className="w-full max-w-md"
        options={[
          { value: "dark", label: "暗色", icon: <Moon /> },
          { value: "light", label: "亮色", icon: <Sun /> },
          { value: "system", label: "跟随系统", icon: <Monitor /> },
        ]}
      />
    </Section>
  );
}

function CliSection() {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const command = `pnpm ep init --base-url ${origin}`;
  return (
    <Section
      title="命令行"
      icon={<Terminal className="size-4 text-ink-3" />}
      description="仓库自带的 epctl 可以拉取、比对、推送和发布端点，凭据保存在仓库之外。详见 docs/OPERATIONS.md。"
    >
      <div className="group relative">
        <pre className="scrollbar-thin overflow-x-auto rounded-md bg-surface-1 p-3 pr-12 font-mono text-xs text-ink-1 shadow-[inset_0_0_0_1px_var(--line)]">
          {command}
        </pre>
        <CopyButton value={command} label="复制命令" className="absolute top-2 right-2" />
      </div>
    </Section>
  );
}
