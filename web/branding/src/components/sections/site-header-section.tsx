import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function SiteHeaderSection() {
  return (
    <Section
      description="The shared header used by every web app. You’re already looking at it — sticky at the top of this page."
      id="site-header"
      title="SiteHeader"
    >
      <Card>
        <Preview label="live — scroll to see sticky behavior">
          <p className="max-w-prose text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">SiteHeader</code>{" "}
            renders the brand (
            <span className="font-bold tracking-wide text-primary">/branding by JFA</span>), an
            optional subtitle, and a right-aligned nav slot (here: the theme toggle). It collapses
            the title on small screens via{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">titleSmol</code>.
            Props:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              title / titleSmol / subtitle / titleHref / navLabel / githubHref
            </code>
            .
          </p>
        </Preview>
      </Card>
    </Section>
  );
}
