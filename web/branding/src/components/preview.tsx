import type { ReactNode } from "react";

export function Specimen({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className="space-y-3">
      {label ? <figcaption className="text-sm text-muted-foreground">{label}</figcaption> : null}
      {children}
    </figure>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
