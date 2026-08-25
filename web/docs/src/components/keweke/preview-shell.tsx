import type { ReactNode } from "react";

type PreviewShellProps = {
  children: ReactNode;
};

export function PreviewShell({ children }: PreviewShellProps) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border bg-background shadow-sm">
      {children}
    </div>
  );
}
