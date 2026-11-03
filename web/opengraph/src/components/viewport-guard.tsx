import type { ReactNode } from "react";

export function ViewportGuard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div className="viewport-guard-app">{children}</div>
      <div className="viewport-guard" role="alert">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Your screen is too small</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The editor needs a window at least 1180 × 820 pixels. Make the window bigger or zoom the
            page out.
          </p>
        </div>
      </div>
    </>
  );
}
