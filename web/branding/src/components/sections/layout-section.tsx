import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function LayoutSection() {
  return (
    <Section
      description="SiteHeader stays viewport-wide. app-frame owns the 1536px maximum, centered body and side borders. page-gutters and header-gutters preserve the deliberate difference between content and compact navigation."
      id="layout"
      title="Layout"
    >
      <Specimen>
        <dl className="grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-sm font-medium">Header</dt>
            <dd className="font-mono text-xs leading-relaxed text-muted-foreground">
              header-gutters: 8 / 12 / 16px, outside the frame
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium">Frame</dt>
            <dd className="font-mono text-xs leading-relaxed break-words text-muted-foreground">
              app-frame: 1536px maximum, border-x
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-medium">Gutters</dt>
            <dd className="font-mono text-xs leading-relaxed text-muted-foreground">
              page-gutters: 16 / 24 / 32px at base / sm / lg
            </dd>
          </div>
        </dl>
      </Specimen>
      <Specimen label="Spacing and reading width">
        <div className="reading-measure space-y-4 type-body">
          <p>
            Use the 4px spacing scale: gap-2 for related controls, gap-4 between fields, gap-6
            between groups and gap-8 between specimens. Use 2px adjustments only inside compact
            controls.
          </p>
          <p>
            Page introductions and reading copy use reading-measure (65ch). Tables and editors use
            the available frame width. Reference sections use py-10; compact app headers keep py-5
            or py-6.
          </p>
        </div>
      </Specimen>
    </Section>
  );
}
