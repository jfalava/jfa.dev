import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      {...props}
      className={cn("px-3 py-2.5 align-middle text-sm first:pl-4 last:pr-4", className)}
    />
  );
}

export { TableCell };
