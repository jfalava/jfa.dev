import { createFileRoute, Link } from "@tanstack/react-router";

import { KewekeHeader } from "@/components/keweke-header";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8">
        <article className="invoice-paper invoice-rule mx-auto max-w-5xl border border-t-4 border-t-primary">
          <div className="px-4 py-8 sm:px-8 sm:py-12">
            <header className="max-w-2xl border-b border-border pb-8">
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                a small note before you shop
              </p>
              <h1 className="mt-3 max-w-xl text-4xl leading-[0.95] font-semibold tracking-[-0.05em] uppercase sm:text-6xl">
                How keweke keeps your list
              </h1>
              <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
                There are two kinds of list here. They look the same on purpose, but they have
                different homes: one stays close to you, and one can travel.
              </p>
            </header>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <HelpSection eyebrow="01 / local" title="The list in your browser">
                <p>
                  A local list is saved in this browser, on this device. No account, network
                  connection, or ceremony is needed. Make as many as you like, while your browser
                  has room for them.
                </p>
                <p>
                  Local lists are a good fit for tonight&apos;s errands, a half-finished idea, or
                  anything you are not ready to share. They are also the one that keeps working when
                  you are offline.
                </p>
                <p>
                  This browser can keep a local display name for attribution. Local lists do not
                  require a user setup, and anonymous local changes remain anonymous.
                </p>
                <Callout label="The boundary">
                  Clear this site&apos;s data, switch browsers, or move to another device and the
                  list will not come along automatically. Local means local.
                </Callout>
              </HelpSection>

              <HelpSection eyebrow="02 / remote" title="The list that can travel">
                <p>
                  A remote list lives in keweke&apos;s list service instead of only in this browser.
                  It is the right place for a list you want to share, open from another device, or
                  keep around after this browser forgets its local data.
                </p>
                <p>
                  Remote lists need a connection when you save a change. Every publish and change
                  is signed by a device key; the private key stays in this browser. Accepted
                  devices can be paired with a short, one-time code.
                </p>
                <Callout label="A plain privacy note">
                  The UUID7 in the address is the list&apos;s address, not a password. Anyone you give
                  it to can read the remote list, so share it with the same care as a shared link.
                </Callout>
              </HelpSection>
            </div>

            <section
              className="mt-10 border-t border-border pt-8"
              aria-labelledby="migration-heading"
            >
              <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                moving house
              </p>
              <h2
                className="mt-2 text-2xl font-semibold tracking-tight uppercase"
                id="migration-heading"
              >
                From local to remote
              </h2>
              <div className="mt-5 grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-3">
                <Step number="1" title="Make it local">
                  Start a new list and add the things you need. It is saved as you go.
                </Step>
                <Step number="2" title="Choose migrate">
                  When it is ready to share, use migrate in the list header. Your list keeps its
                  UUID7 identity.
                </Step>
                <Step number="3" title="Share the address">
                  Send the list&apos;s UUID7 or share link to the people who need it. The remote
                  copy is now the shared one.
                </Step>
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground">
                Migration does not quietly throw away the browser copy. It gives the list a remote
                home while leaving the local snapshot available here.
              </p>
            </section>

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                local when it is yours / remote when it needs to travel
              </p>
              <Link
                className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase underline underline-offset-4"
                to="/"
              >
                back to your lists →
              </Link>
            </footer>
          </div>
        </article>
      </main>
    </div>
  );
}

function HelpSection({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border border-border p-5 sm:p-6">
      <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function Callout({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="border-l-2 border-primary bg-muted/50 px-4 py-3 text-sm leading-6 text-foreground">
      <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">{label}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function Step({
  children,
  number,
  title,
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <div className="border-t border-border pt-3">
      <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">{number}</p>
      <h3 className="mt-1 font-semibold text-foreground">{title}</h3>
      <p className="mt-1">{children}</p>
    </div>
  );
}
