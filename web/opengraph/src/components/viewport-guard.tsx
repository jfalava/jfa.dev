import type { ReactNode } from "react";

export function ViewportGuard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div className="viewport-guard-app">{children}</div>
      <div className="viewport-guard" role="alert">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Your screen is too small</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This editor needs a laptop-sized window. Phones and small tablets are out.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Minimum: a ten-year-old laptop.
          </p>
        </div>
      </div>
    </>
  );
}
