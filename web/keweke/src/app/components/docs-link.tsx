import { buttonVariants } from "@jfa.dev/common/ui";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface DocsLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
}

/** Link into KEWEKE docs. */
export function DocsLink({ children, className, href }: DocsLinkProps) {
  return (
    <a
      className={buttonVariants({
        className: `h-auto gap-0.5 px-0 font-mono text-[10px] tracking-[0.08em] uppercase${className ? ` ${className}` : ""}`,
        size: "xs",
        variant: "link",
      })}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-2.5" />
    </a>
  );
}
