import { Check, Copy } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Button, type ButtonProps } from "./button";
import { toast } from "./toaster";
import { Tooltip } from "./tooltip";

export async function copyText(text: string, label = "已复制") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    toast.error("复制失败，请手动选择复制");
    return false;
  }
}

export function CopyButton({
  value,
  label = "复制",
  toastLabel,
  size = "icon-sm",
  variant = "ghost",
  children,
  ...props
}: Omit<ButtonProps, "value" | "onClick"> & { value: string; label?: string; toastLabel?: string }) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    if (await copyText(value, toastLabel ?? `${label}成功`)) {
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    }
  };
  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={done ? "done" : "copy"}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="grid place-items-center"
      >
        {done ? <Check className="text-signal" /> : <Copy />}
      </motion.span>
    </AnimatePresence>
  );
  if (children) {
    return (
      <Button size={size === "icon-sm" ? "sm" : size} variant={variant} onClick={onClick} {...props}>
        {icon}
        {children}
      </Button>
    );
  }
  return (
    <Tooltip content={label}>
      <Button size={size} variant={variant} onClick={onClick} aria-label={label} {...props}>
        {icon}
      </Button>
    </Tooltip>
  );
}
