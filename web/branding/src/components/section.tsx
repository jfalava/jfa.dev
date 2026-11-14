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
    <section className="scroll-mt-24 space-y-6 py-10" id={id}>
      <div className="reading-measure space-y-2">
        <h2 className="type-section-title">
          <a className="text-foreground hover:text-foreground" href={`#${id}`}>
            {title}
          </a>
        </h2>
        <p className="type-body text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  );
}
