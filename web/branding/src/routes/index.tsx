import {
  Button,
  Checkbox,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Kbd,
  KbdGroup,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CreditCard,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: BrandingPage });

function Section({
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
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          <a className="no-underline hover:underline" href={`#${id}`}>
            {title}
          </a>
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {children}
    </div>
  );
}

function Preview({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="space-y-0">
      {label ? (
        <div className="border-b border-border bg-muted/40 px-4 py-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
      ) : null}
      <div className="preview-grid flex flex-wrap content-center items-center justify-center gap-3 p-6">
        {children}
      </div>
    </div>
  );
}

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

const NAV = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "button", label: "Button" },
  { id: "input", label: "Input" },
  { id: "checkbox", label: "Checkbox" },
  { id: "dropdown-menu", label: "Dropdown" },
  { id: "dialog", label: "Dialog" },
  { id: "table", label: "Table" },
  { id: "kbd", label: "Kbd" },
  { id: "sonner", label: "Sonner" },
];

function BrandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-4 border-b border-border pb-8">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.12em] text-primary uppercase">
            JFA design system
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Branding</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            Single-page reference for every component in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              @jfa.dev/common/ui
            </code>
            .
          </p>
        </div>

        <nav aria-label="Jump to section" className="flex flex-wrap gap-1.5">
          {NAV.map((item) => (
            <a
              className="rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={`#${item.id}`}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-12 py-8">
        <Section
          description="CSS variables from common/src/styles.css. Light and dark values — toggle the theme to compare."
          id="colors"
          title="Colors"
        >
          <Card>
            <Preview label="tokens">
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {TOKENS.map((token) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-border p-2"
                    key={token.name}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-8 shrink-0 rounded-md border border-border ${token.bg}`}
                    />
                    <span className="font-mono text-xs">{token.name}</span>
                  </div>
                ))}
              </div>
            </Preview>
            <Preview label="semantic pairings">
              <div className="flex flex-wrap gap-3">
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
            </Preview>
          </Card>
        </Section>

        <Section
          description="Pretendard (sans), Zilla Slab (serif), Google Sans Code (mono) — all from @fontsource via common."
          id="typography"
          title="Typography"
        >
          <Card>
            <Preview label="families">
              <div className="grid w-full gap-6 text-left sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    sans — Pretendard
                  </p>
                  <p className="font-sans text-lg font-semibold">The quick fox — 500</p>
                  <p className="font-sans text-sm text-muted-foreground">
                    Used for UI, body, and headings.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    serif — Zilla Slab
                  </p>
                  <p className="font-serif text-lg font-semibold">The quick fox — 500</p>
                  <p className="font-serif text-sm text-muted-foreground">
                    Used for display and emphasis.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    mono — Google Sans Code
                  </p>
                  <p className="font-mono text-lg font-semibold">The quick fox — 500</p>
                  <p className="font-mono text-sm text-muted-foreground">Used for code and kbd.</p>
                </div>
              </div>
            </Preview>
            <Preview label="scale">
              <div className="w-full space-y-2 text-left">
                <p className="text-3xl font-bold tracking-tight">Heading 3xl — bold</p>
                <p className="text-xl font-semibold">Heading xl — semibold</p>
                <p className="text-base">Body base — regular</p>
                <p className="text-sm text-muted-foreground">Body sm — muted</p>
                <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  Label xs — mono uppercase
                </p>
              </div>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Variants and sizes from buttonVariants (cva). Focus ring uses ring tokens."
          id="button"
          title="Button"
        >
          <Card>
            <Preview label="variants">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </Preview>
            <Preview label="sizes">
              <Button size="xs">xs</Button>
              <Button size="sm">sm</Button>
              <Button size="default">default</Button>
              <Button size="lg">lg</Button>
              <Button aria-label="Add" size="icon">
                <Plus />
              </Button>
              <Button aria-label="Add small" size="icon-sm">
                <Plus />
              </Button>
              <Button aria-label="Add extra small" size="icon-xs">
                <Plus />
              </Button>
              <Button aria-label="Add large" size="icon-lg">
                <Plus />
              </Button>
            </Preview>
            <Preview label="with icons · data-icon tightens padding">
              <Button>
                <Mail data-icon="inline-start" />
                Login with email
              </Button>
              <Button variant="outline">
                Next
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant="secondary">
                <Search data-icon="inline-start" />
                Search
                <Kbd className="ml-1">⌘K</Kbd>
              </Button>
            </Preview>
            <Preview label="states">
              <Button isDisabled>Disabled</Button>
              <Button aria-busy="true" isDisabled>
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading
              </Button>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Aria Input primitive. Invalid state uses aria-invalid styling; file input has built-in file:: styles."
          id="input"
          title="Input"
        >
          <Card>
            <Preview label="basic">
              <div className="grid w-full max-w-sm gap-4">
                <Input placeholder="you@example.com" type="email" />
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="branding-email">
                    Email
                  </label>
                  <Input id="branding-email" placeholder="you@example.com" type="email" />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll never share your email.
                  </p>
                </div>
              </div>
            </Preview>
            <Preview label="states">
              <div className="grid w-full max-w-sm gap-3">
                <Input disabled placeholder="Disabled" value="can’t edit this" />
                <Input aria-invalid="true" defaultValue="not-an-email" placeholder="Invalid" />
                <Input placeholder="Search…" type="search" />
              </div>
            </Preview>
            <Preview label="file">
              <div className="w-full max-w-sm">
                <Input type="file" />
              </div>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Aria Checkbox. Uses render-prop internally for the check mark. Supports indeterminate and disabled."
          id="checkbox"
          title="Checkbox"
        >
          <Card>
            <Preview label="states">
              <div className="flex flex-wrap gap-6">
                <Checkbox>Unchecked</Checkbox>
                <Checkbox defaultSelected>Checked</Checkbox>
                <Checkbox isIndeterminate>Indeterminate</Checkbox>
                <Checkbox isDisabled>Disabled</Checkbox>
                <Checkbox defaultSelected isDisabled>
                  Disabled checked
                </Checkbox>
              </div>
            </Preview>
            <Preview label="with description">
              <div className="grid w-full max-w-sm gap-4">
                <Checkbox defaultSelected>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm leading-none font-medium">Email notifications</span>
                    <span className="text-xs text-muted-foreground">Receive weekly digests.</span>
                  </span>
                </Checkbox>
                <Checkbox>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm leading-none font-medium">Marketing emails</span>
                    <span className="text-xs text-muted-foreground">
                      Product updates and offers.
                    </span>
                  </span>
                </Checkbox>
              </div>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Aria Menu + Popover. Composition: DropdownMenuTrigger wraps a Button and a DropdownMenu (popover + menu)."
          id="dropdown-menu"
          title="Dropdown Menu"
        >
          <Card>
            <Preview label="basic">
              <DropdownMenuTrigger>
                <Button variant="outline">Open menu</Button>
                <DropdownMenu>
                  <DropdownMenuLabel>My account</DropdownMenuLabel>
                  <DropdownMenuItem textValue="Profile">
                    <User />
                    Profile
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem textValue="Billing">
                    <CreditCard />
                    Billing
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem textValue="Settings">
                    <Settings />
                    Settings
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem textValue="Log out" variant="destructive">
                    <LogOut />
                    Log out
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenu>
              </DropdownMenuTrigger>
            </Preview>
            <Preview label="with sub-menu">
              <DropdownMenuTrigger>
                <Button variant="outline">With sub-menu</Button>
                <DropdownMenu>
                  <DropdownMenuItem textValue="New project">
                    <Plus />
                    New project
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger textValue="Invite">
                      <UserPlus />
                      Invite people
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem textValue="Email">Email</DropdownMenuItem>
                      <DropdownMenuItem textValue="Copy link">Copy link</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem textValue="More">More…</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem textValue="Archive" variant="destructive">
                    Archive
                  </DropdownMenuItem>
                </DropdownMenu>
              </DropdownMenuTrigger>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Aria Modal overlay. DialogTrigger wraps the trigger and the Dialog (which renders its own overlay + modal)."
          id="dialog"
          title="Dialog"
        >
          <Card>
            <Preview label="example">
              <DialogTrigger>
                <Button variant="outline">Open dialog</Button>
                <Dialog>
                  <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                      This will permanently showcase the dialog component. You can close with Esc,
                      the × button, or clicking outside.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    Dialog body — put forms, confirmations, or any content here.
                  </div>
                  <DialogFooter>
                    <Button slot="close" variant="outline">
                      Cancel
                    </Button>
                    <Button slot="close">Confirm</Button>
                  </DialogFooter>
                </Dialog>
              </DialogTrigger>
            </Preview>
            <Preview label="without close button">
              <DialogTrigger>
                <Button variant="secondary">Open (no ×)</Button>
                <Dialog showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Heads up</DialogTitle>
                    <DialogDescription>Close only via the footer or overlay.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button slot="close" variant="outline">
                      Got it
                    </Button>
                  </DialogFooter>
                </Dialog>
              </DialogTrigger>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Plain table primitives with container overflow. Header / body / footer / caption slots."
          id="table"
          title="Table"
        >
          <Card>
            <Preview>
              <div className="w-full">
                <Table>
                  <TableCaption>Invoices — demo data.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">INV001</TableCell>
                      <TableCell>Paid</TableCell>
                      <TableCell>Card</TableCell>
                      <TableCell className="text-right">$250.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">INV002</TableCell>
                      <TableCell>Pending</TableCell>
                      <TableCell>PayPal</TableCell>
                      <TableCell className="text-right">$150.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">INV003</TableCell>
                      <TableCell>Unpaid</TableCell>
                      <TableCell>Transfer</TableCell>
                      <TableCell className="text-right">$350.00</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">$750.00</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Preview>
            <Preview label="with checkboxes">
              <div className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox aria-label="Select all" />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Checkbox aria-label="Select Ada" defaultSelected />
                      </TableCell>
                      <TableCell className="font-medium">Ada</TableCell>
                      <TableCell className="text-right">42</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Checkbox aria-label="Select Bob" />
                      </TableCell>
                      <TableCell className="font-medium">Bob</TableCell>
                      <TableCell className="text-right">27</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Kbd + KbdGroup from react-aria-components. Inherits muted styling; adapts inside tooltips via data-slot."
          id="kbd"
          title="Kbd"
        >
          <Card>
            <Preview label="single">
              <div className="flex flex-wrap gap-2">
                <Kbd>⌘</Kbd>
                <Kbd>⇧</Kbd>
                <Kbd>⌥</Kbd>
                <Kbd>↵</Kbd>
                <Kbd>Esc</Kbd>
                <Kbd>A</Kbd>
              </div>
            </Preview>
            <Preview label="groups">
              <div className="flex flex-wrap gap-6">
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Shift</Kbd>
                  <Kbd>P</Kbd>
                </KbdGroup>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>N</Kbd>
                </KbdGroup>
              </div>
            </Preview>
            <Preview label="in context">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Press</span>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>J</Kbd>
                </KbdGroup>
                <span className="text-muted-foreground">to open the palette</span>
              </div>
            </Preview>
          </Card>
        </Section>

        <Section
          description="Sonner toaster (common/ui/Toaster). Theme-aware via the header toggle. Try each toast variant."
          id="sonner"
          title="Sonner · Toaster"
        >
          <Card>
            <Preview label="toast variants">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onPress={() => toast("Heads up — plain toast.")}>
                  Default
                </Button>
                <Button variant="outline" onPress={() => toast.success("Saved successfully.")}>
                  Success
                </Button>
                <Button variant="outline" onPress={() => toast.error("Something went wrong.")}>
                  Error
                </Button>
                <Button
                  variant="outline"
                  onPress={() => toast.info("FYI — new version available.")}
                >
                  Info
                </Button>
                <Button variant="outline" onPress={() => toast.warning("Check your input.")}>
                  Warning
                </Button>
                <Button
                  variant="outline"
                  onPress={() =>
                    toast.promise(new Promise((resolve) => setTimeout(resolve, 1200)), {
                      loading: "Saving…",
                      success: "Saved!",
                      error: "Failed",
                    })
                  }
                >
                  Promise
                </Button>
              </div>
            </Preview>
            <Preview label="with description & action">
              <Button
                variant="secondary"
                onPress={() =>
                  toast("Event created", {
                    description: "Sunday · 10:30 AM",
                    action: { label: "Undo", onClick: () => toast("Undone") },
                  })
                }
              >
                With action
              </Button>
            </Preview>
          </Card>
        </Section>

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
                optional subtitle, and a right-aligned nav slot (here: the theme toggle). It
                collapses the title on small screens via{" "}
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
      </div>

      <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <p>
          <code className="rounded bg-muted px-1 py-0.5 font-mono">@jfa.dev/common/ui</code> ·{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">@jfa.dev/branding</code> · check
          site-header theme toggle for light / dark / system.
        </p>
      </footer>
    </main>
  );
}
