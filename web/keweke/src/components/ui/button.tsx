import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";

import { cn } from "@/lib/utils";

type ButtonProps = Omit<AriaButtonProps, "className"> & {
  className?: string;
  variant?: "default" | "outline" | "ghost";
};

const variants = {
  default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-border hover:bg-input/50 hover:text-foreground",
  ghost: "border-transparent hover:bg-muted hover:text-foreground",
} as const;

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
    />
  );
}
