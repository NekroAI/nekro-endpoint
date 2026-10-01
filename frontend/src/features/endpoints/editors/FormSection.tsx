import type { ReactNode } from "react";

export function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line px-6 py-6 last:border-b-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
      <div>
        <h3 className="text-sm font-medium text-ink-1">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>}
      </div>
      <div className="grid min-w-0 content-start items-start gap-4">{children}</div>
    </section>
  );
}
