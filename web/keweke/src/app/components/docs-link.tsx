import { buttonVariants } from "@jfa.dev/common/ui";
import { ArrowUpRight, Info } from "lucide-react";
import type { ReactNode } from "react";

interface DocsLinkProps {
  children?: ReactNode;
  className?: string;
  href: string;
  /**
   * `inline` — mono chip with external arrow (body copy, footers).
   * `info` — quiet Info icon + optional label (empty states, nudges).
   */
  variant?: "inline" | "info";
}

/** Link into KEWEKE docs. Opens in a new tab. */
export function DocsLink({ children, className, href, variant = "inline" }: DocsLinkProps) {
  if (variant === "info") {
    return (
      <a
        className={buttonVariants({
          className: `h-auto gap-1 px-0 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase hover:text-foreground${className ? ` ${className}` : ""}`,
          size: "xs",
          variant: "link",
        })}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Info aria-hidden="true" className="size-3 stroke-[1.5]" />
        {children ? <span>{children}</span> : null}
        <ArrowUpRight aria-hidden="true" className="size-2.5 opacity-70" />
      </a>
    );
  }

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
