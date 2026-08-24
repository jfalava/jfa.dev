import type { ReactNode } from "react";

type PreviewShellProps = {
  caption?: string;
  children: ReactNode;
  label?: string;
};

export function PreviewShell({
  caption,
  children,
  label = "Preview — live component",
}: PreviewShellProps) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="border-b bg-muted/30 px-3 py-2">
        <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <div className="bg-background">{children}</div>
      {caption ? (
        <div className="border-t bg-muted/20 px-3 py-2">
          <p className="font-mono text-[10px] leading-relaxed tracking-wide text-muted-foreground">
            {caption}
          </p>
        </div>
      ) : null}
    </div>
  );
}
