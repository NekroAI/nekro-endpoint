import { Globe, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import type { EndpointType } from "../../../../common/types";
import { TypeGlyph, typeMeta } from "../../design/glyphs";
import { errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { spotlight } from "../../lib/spotlight";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogFooter } from "../../ui/dialog";
import { Field } from "../../ui/field";
import { Input } from "../../ui/input";
import { Segmented } from "../../ui/segmented";
import { Spinner } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import { useGroups } from "../access/api";
import { useCreateEndpoint } from "./api";
import { defaultConfig, normalizePath, validatePath } from "./model";
import { useWorkspace } from "./workspace";

const TYPES: EndpointType[] = ["static", "proxy", "dynamicProxy", "script"];

function suggestName(path: string) {
  const last = path.split("/").filter(Boolean).pop() ?? "";
  return last
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function CreateEndpointDialog() {
  const { createPrefix, closeCreate, endpoints, username, select } = useWorkspace();
  const create = useCreateEndpoint();
  const { data: groups = [] } = useGroups();
  const open = createPrefix !== null;

  const [type, setType] = useState<EndpointType>("static");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [access, setAccess] = useState<"public" | "authenticated">("public");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("static");
    setPath((createPrefix ?? "").replace(/^\/+/, ""));
    setName("");
    setNameTouched(false);
    setAccess("public");
    setSelectedGroups([]);
    setSubmitted(false);
  }, [open, createPrefix]);

  const normalized = normalizePath(path);
  const pathError = validatePath(normalized, (candidate) => endpoints.some((endpoint) => endpoint.path === candidate));
  const parentDynamic = endpoints.find(
    (endpoint) => endpoint.type === "dynamicProxy" && normalized.startsWith(`${endpoint.path}/`),
  );
  const finalName = (nameTouched ? name : name || suggestName(normalized)).trim();
  const groupError = access === "authenticated" && selectedGroups.length === 0 ? "至少选择一个权限组" : null;
  const errors = {
    path: pathError,
    name: finalName ? null : "请输入名称",
    groups: groupError,
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async () => {
    setSubmitted(true);
    if (invalid) return;
    try {
      const endpoint = await create.mutateAsync({
        name: finalName,
        path: normalized,
        type,
        config: defaultConfig(type),
        accessControl: access,
        requiredPermissionGroups: access === "authenticated" ? selectedGroups : [],
      });
      toast.success("端点已创建（草稿）", { description: "编辑好内容后发布即可上线。" });
      closeCreate();
      await select(endpoint.path);
    } catch (error) {
      toast.error("创建失败", { description: errorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeCreate()}>
      <DialogContent
        title="新建端点"
        description="新端点以草稿创建，发布前不会对外可见。"
        className="w-[min(640px,calc(100vw-32px))]"
      >
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div role="radiogroup" aria-label="端点类型" className="grid grid-cols-2 gap-2">
            {TYPES.map((candidate) => {
              const meta = typeMeta[candidate];
              const active = candidate === type;
              const soon = candidate === "script";
              return (
                <button
                  key={candidate}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={soon}
                  onClick={() => setType(candidate)}
                  {...spotlight}
                  className={cn(
                    "spotlight group relative flex gap-3 rounded-md p-3 text-left transition-[background-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-45",
                    active
                      ? "bg-signal-soft shadow-[inset_0_0_0_1px_var(--signal)]"
                      : "bg-surface-1 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface-2",
                  )}
                >
                  <TypeGlyph
                    type={candidate}
                    className={cn("mt-0.5 size-4 shrink-0", active ? "text-signal" : "text-ink-2")}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink-1">
                      {meta.label}
                      {soon && <span className="text-2xs font-normal text-ink-4">即将推出</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{meta.summary}</span>
                    <span className="mt-1 block text-2xs text-ink-4">{meta.example}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <Field
            label="地址"
            error={submitted || path ? errors.path : null}
            hint={
              parentDynamic
                ? `位于动态代理 ${parentDynamic.path} 之下：这个精确路径会由新端点响应，其余子路径仍由动态代理转发`
                : undefined
            }
          >
            <div
              className={cn(
                "flex min-w-0 items-center rounded-sm bg-surface-1 font-mono text-sm shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1px_var(--signal),0_0_0_3px_var(--signal-soft)]",
              )}
            >
              <span className="shrink-0 pl-2.5 text-ink-4">/e/{username}/</span>
              <input
                autoFocus
                value={path}
                onChange={(event) => setPath(event.target.value.replace(/^\/+/, ""))}
                placeholder="configs/app.json"
                className="h-9 min-w-0 flex-1 bg-transparent pr-2.5 text-ink-1 outline-none placeholder:text-ink-4"
              />
            </div>
          </Field>

          <Field label="名称" hint="只在控制台中显示" error={submitted ? errors.name : null}>
            <Input
              value={nameTouched ? name : name || suggestName(normalized)}
              maxLength={100}
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
            />
          </Field>

          <div className="grid gap-2">
            <span className="text-xs font-medium text-ink-2">访问</span>
            <Segmented
              label="访问控制"
              value={access}
              onChange={setAccess}
              className="w-full max-w-xs"
              options={[
                { value: "public", label: "公开", icon: <Globe /> },
                { value: "authenticated", label: "受保护", icon: <Lock /> },
              ]}
            />
            {access === "authenticated" &&
              (groups.length === 0 ? (
                <p className="text-xs text-caution">还没有权限组。可以先创建为公开，或到「访问」中创建权限组。</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((group) => {
                    const on = selectedGroups.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSelectedGroups(
                            on ? selectedGroups.filter((id) => id !== group.id) : [...selectedGroups, group.id],
                          )
                        }
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs",
                          on
                            ? "bg-pass-soft text-pass shadow-[inset_0_0_0_1px_var(--pass)]"
                            : "text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-surface-2",
                        )}
                      >
                        <Lock className="size-3" /> {group.name}
                      </button>
                    );
                  })}
                </div>
              ))}
            {submitted && errors.groups && <p className="text-xs text-danger">{errors.groups}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeCreate}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={create.isPending || (submitted && invalid)}>
              {create.isPending && <Spinner className="text-current" />} 创建草稿
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
