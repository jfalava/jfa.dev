import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function LayoutSection() {
  return (
    <Section
      description="SiteHeader stays viewport-wide. Page body sits in a max-w-screen-2xl frame with border-x. Gutters are px-4 sm:px-6 lg:px-8. Do not nest the header inside the frame."
      id="layout"
      title="Layout"
    >
      <Specimen>
        <dl className="grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-sm font-medium">Header</dt>
            <dd className="font-mono text-xs leading-relaxed text-muted-foreground">
              SiteHeader full-bleed, outside the shell
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium">Frame</dt>
            <dd className="font-mono text-xs leading-relaxed break-words text-muted-foreground">
              max-w-screen-2xl border-x border-border
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium">Gutters</dt>
            <dd className="font-mono text-xs leading-relaxed text-muted-foreground">
              px-4 sm:px-6 lg:px-8
            </dd>
          </div>
        </dl>
      </Specimen>
    </Section>
  );
}
