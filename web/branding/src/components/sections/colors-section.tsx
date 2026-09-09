import { Specimen } from "@/components/preview";
import { Section } from "@/components/section";

const TOKENS: Array<{ bg: string; name: string }> = [
  { bg: "bg-background", name: "background" },
  { bg: "bg-foreground", name: "foreground" },
  { bg: "bg-card", name: "card" },
  { bg: "bg-popover", name: "popover" },
  { bg: "bg-primary", name: "primary" },
  { bg: "bg-secondary", name: "secondary" },
  { bg: "bg-muted", name: "muted" },
  { bg: "bg-accent", name: "accent" },
  { bg: "bg-destructive", name: "destructive" },
  { bg: "bg-success", name: "success" },
  { bg: "bg-border", name: "border" },
  { bg: "bg-input", name: "input" },
  { bg: "bg-ring", name: "ring" },
];

export function ColorsSection() {
  return (
    <Section
      description="CSS variables in common/src/styles.css. Toggle the header theme to see light and dark."
      id="colors"
      title="Colors"
    >
      <Specimen label="Tokens">
        <ul className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOKENS.map((token) => (
            <li className="flex items-center gap-3" key={token.name}>
              <span
                aria-hidden="true"
                className={`size-8 shrink-0 rounded-md border border-border ${token.bg}`}
              />
              <span className="font-mono text-xs">{token.name}</span>
            </li>
          ))}
        </ul>
      </Specimen>
      <Specimen label="Pairings">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            primary
          </span>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
            secondary
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            muted
          </span>
          <span className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground">
            accent
          </span>
          <span className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground">
            destructive
          </span>
          <span className="rounded-md bg-success px-3 py-1.5 text-sm text-success-foreground">
            success
          </span>
        </div>
      </Specimen>
    </Section>
  );
}
