import type { ReactNode } from "react";

export function Section({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-20 space-y-4" id={id}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          <a className="no-underline hover:underline" href={`#${id}`}>
            {title}
          </a>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
