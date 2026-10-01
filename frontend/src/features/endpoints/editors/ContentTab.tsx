import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m as motion } from "motion/react";
import type { DynamicProxyConfig, ProxyConfig, ScriptConfig, StaticConfig } from "../../../../../common/types";
import { useUpdateEndpoint } from "../api";
import type { EndpointView } from "../model";
import { useWorkspace } from "../workspace";
import { useHotkey } from "../../../lib/hotkeys";
import { errorMessage } from "../../../lib/api";
import { relativeTime } from "../../../lib/format";
import { toast } from "../../../ui/toaster";
import { Button } from "../../../ui/button";
import { Kbd } from "../../../ui/kbd";
import { Spinner } from "../../../ui/skeleton";
import { StaticEditor } from "./StaticEditor";
import { ProxyEditor, validateProxy } from "./ProxyEditor";
import { DynamicProxyEditor, validateDynamicProxy } from "./DynamicProxyEditor";
import { ScriptEditor } from "./ScriptEditor";

function validate(endpoint: EndpointView, config: EndpointView["config"]) {
  if (endpoint.type === "proxy") return validateProxy(config as ProxyConfig);
  if (endpoint.type === "dynamicProxy") return validateDynamicProxy(config as DynamicProxyConfig);
  return {};
}

/** Drafted config editing with explicit save (⌘S) and a dirty guard. */
export function ContentTab({ endpoint }: { endpoint: EndpointView }) {
  const { setDirty } = useWorkspace();
  const update = useUpdateEndpoint();
  const [draft, setDraft] = useState(endpoint.config);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const baseline = JSON.stringify(endpoint.config);
  const dirty = JSON.stringify(draft) !== baseline;

  // A new endpoint, or a server-side change while clean, replaces the draft.
  useEffect(() => {
    setDraft(endpoint.config);
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.id]);
  useEffect(() => {
    if (!dirty) setDraft(endpoint.config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline]);

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  const errors = useMemo(() => validate(endpoint, draft), [endpoint, draft]);
  const invalid = Object.keys(errors).length > 0;

  const save = async () => {
    if (!dirty || update.isPending) return;
    if (invalid) {
      toast.error("还有需要修正的字段");
      return;
    }
    try {
      await update.mutateAsync({ id: endpoint.id, config: draft });
      setSavedAt(new Date().toISOString());
      toast.success(endpoint.isPublished ? "已保存，线上立即生效" : "已保存");
    } catch (error) {
      toast.error("保存失败", { description: errorMessage(error) });
    }
  };
  useHotkey("mod+s", () => void save());

  const editor = (() => {
    switch (endpoint.type) {
      case "static":
        return <StaticEditor value={draft as StaticConfig} onChange={setDraft} onSave={() => void save()} />;
      case "proxy":
        return <ProxyEditor value={draft as ProxyConfig} onChange={setDraft} />;
      case "dynamicProxy":
        return <DynamicProxyEditor value={draft as DynamicProxyConfig} onChange={setDraft} />;
      case "script":
        return <ScriptEditor value={draft as ScriptConfig} onChange={setDraft} onSave={() => void save()} />;
    }
  })();
  const scrolls = endpoint.type === "proxy" || endpoint.type === "dynamicProxy";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={scrolls ? "scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-24" : "min-h-0 flex-1"}>{editor}</div>
      <footer className="flex h-12 shrink-0 items-center gap-3 border-t border-line px-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={dirty ? "dirty" : "clean"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 text-xs text-ink-3"
          >
            {dirty ? (
              <>
                <span className="size-1.5 rounded-full bg-caution" /> 未保存的修改
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-ink-4" />
                {savedAt ? `已保存 · ${relativeTime(savedAt)}` : `上次更新 ${relativeTime(endpoint.updatedAt)}`}
              </>
            )}
          </motion.span>
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <Button size="sm" variant="ghost" onClick={() => setDraft(endpoint.config)}>
              还原
            </Button>
          )}
          <Button size="sm" variant={dirty ? "primary" : "secondary"} disabled={!dirty || update.isPending} onClick={() => void save()}>
            {update.isPending && <Spinner className="text-current" />}
            保存
            <span className="ml-1 hidden items-center gap-0.5 opacity-70 sm:flex">
              <Kbd className="h-4 min-w-4 bg-transparent text-current shadow-none">⌘S</Kbd>
            </span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
