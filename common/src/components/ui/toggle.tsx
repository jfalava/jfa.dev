"use client";

import { cn } from "../../lib/utils";

import { cva, type VariantProps } from "class-variance-authority";
import { ToggleButton as AriaToggleButton } from "react-aria-components";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-transparent hover:bg-muted hover:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:border-primary",
        outline:
          "border-input bg-input/20 hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary/10 data-[selected]:text-primary data-[selected]:border-primary/30 dark:data-[selected]:bg-primary/20",
      },
      size: {
        default: "h-7 px-2.5 has-[>svg]:px-2",
        sm: "h-6 px-2 text-[11px] has-[>svg]:px-1.5",
        lg: "h-8 px-3 has-[>svg]:px-2",
        icon: "size-7",
        "icon-sm": "size-6",
        "icon-lg": "size-8",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

type ToggleProps = React.ComponentProps<typeof AriaToggleButton> &
  VariantProps<typeof toggleVariants> & {
    className?: string;
  };

function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <AriaToggleButton
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
