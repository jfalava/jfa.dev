import { createFileRoute } from "@tanstack/react-router";

import Grainient from "../components/grainient";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Grainient
        className="pointer-events-none absolute inset-0 size-full"
        color1="#c7d2fe"
        color2="#6366f1"
        color3="#312e81"
        grainAmount={0.08}
        saturation={1.05}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <h1 className="font-semibold text-center text-3xl tracking-tight text-primary-foreground drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)] sm:text-4xl">
          jorge fernando álava
        </h1>
      </div>
    </main>
  );
}
