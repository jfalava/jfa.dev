import { cn } from "../../lib/utils";

import { Keyboard as KbdPrimitive } from "react-aria-components";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <KbdPrimitive
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-6 w-fit min-w-6 select-none items-center justify-center gap-1 rounded-md border border-zinc-200 border-b-zinc-300 bg-gradient-to-b from-white to-zinc-50 px-1.5 font-mono text-[11px] leading-none font-medium tracking-wide text-zinc-700 shadow-[0_1.5px_0_0_hsl(var(--primary)),0_1px_2px_rgba(0,0,0,0.06),0_4px_10px_hsl(var(--primary)/0.14),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-zinc-700 dark:border-b-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200 dark:shadow-[0_1.5px_0_0_hsl(var(--primary)),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_hsl(var(--primary)/0.22),inset_0_1px_0_rgba(255,255,255,0.06)] in-data-[slot=tooltip-content]:border-white/15 in-data-[slot=tooltip-content]:bg-white/10 in-data-[slot=tooltip-content]:from-transparent in-data-[slot=tooltip-content]:to-transparent in-data-[slot=tooltip-content]:text-white in-data-[slot=tooltip-content]:shadow-none [&_svg:not([class*='size-'])]:size-3",
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
