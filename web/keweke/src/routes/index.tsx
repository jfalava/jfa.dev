import { createFileRoute } from "@tanstack/react-router";

import { KewekeHeader } from "@/components/keweke-header";

export const Route = createFileRoute("/")({ component: EmptyState });

function EmptyState() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <section className="invoice-paper invoice-rule border border-t-4 border-t-primary">
          <div className="px-4 py-16 sm:px-8 sm:py-24">
            <h1 className="max-w-xl text-4xl leading-[0.95] font-semibold tracking-[-0.05em] uppercase sm:text-6xl">
              No list loaded
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              Paste a shared UUID7 in the header and open it.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
