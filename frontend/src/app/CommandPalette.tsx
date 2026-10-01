import { Command } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect } from "react";
import { useCommands } from "./commands";
import { Kbd } from "../ui/kbd";

/** ⌘K palette: fuzzy search over every registered command. */
export function CommandPalette() {
  const { items, open, setOpen } = useCommands();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgb(0_0_0/0.35)] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed top-[14vh] left-1/2 z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-lg glass shadow-float data-[state=open]:animate-fade-in focus:outline-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">命令面板</DialogPrimitive.Title>
          <Command loop className="flex max-h-[min(520px,70vh)] flex-col" label="命令面板">
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 text-ink-3" />
              <Command.Input
                autoFocus
                placeholder="搜索端点、页面或操作…"
                className="h-12 flex-1 bg-transparent text-md text-ink-1 outline-none placeholder:text-ink-4"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="scrollbar-thin overflow-y-auto p-2">
              <Command.Empty className="px-3 py-10 text-center text-sm text-ink-3">没有匹配的结果</Command.Empty>
              {Object.entries(groups).map(([group, groupItems]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-4 [&_[cmdk-group-heading]]:uppercase"
                >
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.hint ?? ""} ${(item.keywords ?? []).join(" ")} ${item.id}`}
                        onSelect={() => {
                          setOpen(false);
                          item.run();
                        }}
                        className="group flex h-10 cursor-default items-center gap-3 rounded-sm px-2 text-sm text-ink-2 data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink-1"
                      >
                        {Icon && <Icon className="size-4 shrink-0 text-ink-3 group-data-[selected=true]:text-signal" />}
                        <span className="truncate">{item.label}</span>
                        {item.hint && <span className="truncate font-mono text-xs text-ink-4">{item.hint}</span>}
                        <span className="ml-auto flex items-center gap-1">
                          {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                          <CornerDownLeft className="hidden size-3.5 text-ink-3 group-data-[selected=true]:block" />
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
