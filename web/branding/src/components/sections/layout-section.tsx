import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function LayoutSection() {
  return (
    <Section
      description="A shared frame makes wide pages feel deliberate: a centered canvas, hard vertical rules, and gutters that scale with the viewport."
      id="layout"
      title="Layout frame"
    >
      <Card>
        <Preview label="frame anatomy">
          <div className="w-full max-w-3xl border-x border-border bg-background">
            <div className="border-b border-border px-4 py-3 sm:px-6 lg:px-8">
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                centered application canvas
              </p>
            </div>
            <div className="grid w-full gap-6 p-4 text-left sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)]">
              <div className="space-y-2">
                <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Design decision
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  SiteHeader is always full-bleed across the viewport. Only page body content sits
                  inside the centered frame with explicit vertical rules — never nest the shared
                  header inside <code className="font-mono text-xs">max-w-screen-2xl</code>.
                </p>
              </div>
              <div className="space-y-4 border-t border-border pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                <div className="space-y-1">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    Header
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 font-mono text-xs break-words text-foreground">
                    SiteHeader full-bleed (outside shell)
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    Content shell
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 font-mono text-xs break-words text-foreground">
                    max-w-screen-2xl border-x border-border
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                    Content gutter
                  </p>
                  <code className="block rounded bg-muted px-2 py-1 font-mono text-xs break-words text-foreground">
                    px-4 sm:px-6 lg:px-8
                  </code>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6 lg:px-8">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                table edge
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                aligned
              </span>
            </div>
          </div>
        </Preview>
      </Card>
    </Section>
  );
}
