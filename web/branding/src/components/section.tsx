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
        <h2 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
          <a className="no-underline hover:underline" href={`#${id}`}>
            {title}
          </a>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
