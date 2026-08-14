import { Check } from "lucide-react";
import type { ReactNode } from "react";
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";

import { cn } from "../../lib/utils";

type CheckboxProps = Omit<AriaCheckboxProps, "children" | "className"> & {
  children?: ReactNode;
  className?: string;
};

function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={cn(
        "group inline-flex min-w-0 items-center gap-2 rounded-sm text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      {({ isSelected }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-none border border-input bg-background text-primary-foreground transition-colors",
              isSelected && "border-primary bg-primary",
            )}
          >
            {isSelected && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

export { Checkbox };
