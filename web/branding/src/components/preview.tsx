import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {children}
    </div>
  );
}

export function Preview({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="space-y-0">
      {label ? (
        <div className="border-b border-border bg-muted/40 px-4 py-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
      ) : null}
      <div className="preview-grid flex flex-wrap content-center items-center justify-center gap-3 p-6">
        {children}
      </div>
    </div>
  );
}
