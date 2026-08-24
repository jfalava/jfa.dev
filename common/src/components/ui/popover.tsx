// oxlint-disable typescript/no-explicit-any, typescript/no-unsafe-assignment -- popover wraps DialogTrigger with passthrough any props for compat
"use client";

import { cn } from "../../lib/utils";

import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";

// oxlint-disable-next-line typescript/no-explicit-any -- Popover wraps DialogTrigger which has complex ChildrenOrFunction types
export function Popover(props: any) {
  const { open, isOpen, onOpenChange, children, ...rest } = props;
  const isOpenValue = isOpen ?? open;
  return (
    <AriaDialogTrigger
      data-slot="popover"
      isOpen={isOpenValue}
      onOpenChange={onOpenChange}
      {...rest}
    >
      {children}
    </AriaDialogTrigger>
  );
}

// oxlint-disable-next-line typescript/no-explicit-any -- trigger mirrors base-ui PopoverTrigger API for compat
export function PopoverTrigger({ className, children, ...props }: any) {
  return (
    <AriaButton
      data-slot="popover-trigger"
      className={cn(
        "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
      {...props}
    >
      {children}
    </AriaButton>
  );
}

export function PopoverPositioner({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// oxlint-disable-next-line typescript/no-explicit-any -- PopoverContent wraps AriaPopover with passthrough props
export function PopoverContent({ className, children, ...props }: any) {
  return (
    <AriaPopover
      data-slot="popover-content"
      className={cn(
        "z-50 w-72 origin-(--trigger-anchor-point) rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95",
        className,
      )}
      {...props}
    >
      <AriaDialog className="outline-none">{children}</AriaDialog>
    </AriaPopover>
  );
}

export function PopoverAnchor(props: React.ComponentProps<"div">) {
  return <div data-slot="popover-anchor" {...props} />;
}
