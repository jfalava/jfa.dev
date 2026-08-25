import { cn } from "../../lib/utils";

import { cva, type VariantProps } from "class-variance-authority";
import { Keyboard as KbdPrimitive } from "react-aria-components";

const kbdVariants = cva(
  "inline-flex w-fit select-none items-center justify-center gap-1 rounded-md border font-mono font-medium tracking-wide transition-all duration-100 relative -top-px [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-zinc-200 bg-gradient-to-b from-white to-zinc-50 text-zinc-700 shadow-[0_3px_0_0_var(--primary)] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_var(--primary)] dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200 dark:shadow-[0_3px_0_0_var(--primary)] dark:hover:shadow-[0_2px_0_0_var(--primary)]",
        embedded:
          "border-zinc-200 bg-zinc-50 text-zinc-600 shadow-none hover:translate-y-0 hover:shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none",
      },
      size: {
        default: "h-6 min-w-6 px-1.5 text-[11px] leading-none",
        sm: "h-5 min-w-5 px-1 text-[10px] leading-none",
        xs: "h-4 min-w-4 px-1 text-[10px] leading-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type KbdProps = React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>;

function Kbd({ className, variant, size, ...props }: KbdProps) {
  return (
    <KbdPrimitive
      data-slot="kbd"
      className={cn(
        kbdVariants({ variant, size }),
        // Auto-compact when nested inside a Button / .group/button (covers Button and <a> with buttonVariants)
        // Base already nudged -top-px for optical alignment (standalone + button); button overrides size/shadow
        // For primary buttons shadow is invisible (same as bg), so add a visible border
        "in-data-[slot=button]:h-4 in-data-[slot=button]:min-w-4 in-data-[slot=button]:px-1 in-data-[slot=button]:text-[10px] in-data-[slot=button]:leading-none in-data-[slot=button]:shadow-none in-data-[slot=button]:hover:translate-y-0 in-data-[slot=button]:hover:shadow-none in-data-[slot=button]:border-zinc-300 dark:in-data-[slot=button]:border-zinc-600",
        "in-[.group\\/button]:h-4 in-[.group\\/button]:min-w-4 in-[.group\\/button]:px-1 in-[.group\\/button]:text-[10px] in-[.group\\/button]:leading-none in-[.group\\/button]:shadow-none in-[.group\\/button]:hover:translate-y-0 in-[.group\\/button]:hover:shadow-none in-[.group\\/button]:border-zinc-300 dark:in-[.group\\/button]:border-zinc-600",
        // Preserve tooltip override (reset nudge inside tooltip)
        "in-data-[slot=tooltip-content]:top-0 in-data-[slot=tooltip-content]:h-auto in-data-[slot=tooltip-content]:min-w-0 in-data-[slot=tooltip-content]:border-white/15 in-data-[slot=tooltip-content]:bg-white/10 in-data-[slot=tooltip-content]:from-transparent in-data-[slot=tooltip-content]:to-transparent in-data-[slot=tooltip-content]:px-1 in-data-[slot=tooltip-content]:text-white in-data-[slot=tooltip-content]:shadow-none hover:in-data-[slot=tooltip-content]:translate-y-0 hover:in-data-[slot=tooltip-content]:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <span
      data-slot="kbd-group"
      className={cn(
        // Flex envelope; vertical nudge is handled by individual Kbd (relative -top-px in base)
        // so group itself stays unshifted to avoid double -2px when KbdGroup is inside Button
        "inline-flex items-center gap-1",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd, KbdGroup, kbdVariants };
