import { cn } from "../../lib/utils";

import { Keyboard as KbdPrimitive } from "react-aria-components";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <KbdPrimitive
      data-slot="kbd"
      className={cn(
        "inline-flex h-6 w-fit min-w-6 select-none items-center justify-center gap-1 rounded-md border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 px-1.5 font-mono text-[11px] leading-none font-medium tracking-wide text-zinc-700 shadow-[0_3px_0_0_var(--primary)] transition-all duration-100 hover:translate-y-[1px] hover:shadow-[0_2px_0_0_var(--primary)] dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200 dark:shadow-[0_3px_0_0_var(--primary)] dark:hover:shadow-[0_2px_0_0_var(--primary)] in-data-[slot=tooltip-content]:border-white/15 in-data-[slot=tooltip-content]:bg-white/10 in-data-[slot=tooltip-content]:from-transparent in-data-[slot=tooltip-content]:to-transparent in-data-[slot=tooltip-content]:text-white in-data-[slot=tooltip-content]:shadow-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <KbdPrimitive
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
