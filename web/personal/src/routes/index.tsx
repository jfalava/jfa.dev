import { createFileRoute } from "@tanstack/react-router";

import Grainient from "../components/grainient";
import TextPressure from "../components/text-pressure";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e1116]">
      <Grainient
        className="pointer-events-none absolute inset-0 size-full"
        color1="#f2f6ff"
        color2="#8ca4ff"
        color3="#1c2642"
        grainAmount={0.1}
        saturation={1}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="h-36 w-full max-w-5xl sm:h-44">
          <TextPressure
            text="jorge fernando álava"
            textColor="#000000"
            stroke={false}
            flex={false}
            scale={false}
            width={false}
            weight
            italic={false}
            useWebkitFallback
            webkitFallbackClassName="font-sans text-black text-5xl md:text-7xl drop-shadow-none text-shadow-none"
            minFontSize={30}
            className="font-sans font-medium leading-[0.95] tracking-tight drop-shadow-none text-shadow-none cursor-default select-none"
          />
        </div>
      </div>
    </main>
  );
}
