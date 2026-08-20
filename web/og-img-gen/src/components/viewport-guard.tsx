import type { ReactNode } from "react";

export function ViewportGuard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div className="viewport-guard-app">{children}</div>
      <div className="viewport-guard" role="alert">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-primary">Oh. Oh no!</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Your screen is too small</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The OpenGraph image creator doesn't support small screens like phones or small tablets.
            In the future, perhaps?
          </p>
          <p className="mt-4 text-sm font-semibold tracking-tight uppercase">
            The minimum supported size is bigger than your phone
          </p>
        </div>
      </div>
    </>
  );
}
