import { Plus, Check, Loader2, Type } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/stores/editor-store";

const POPULAR_GOOGLE_FONTS = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Playfair Display",
  "Merriweather",
  "Raleway",
  "Nunito",
  "Ubuntu",
  "Fira Sans",
];

export function FontManager() {
  const [fontInput, setFontInput] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const fonts = useEditorStore((s) => s.fonts);
  const addGoogleFont = useEditorStore((s) => s.addGoogleFont);
  const setFontLoaded = useEditorStore((s) => s.setFontLoaded);

  const loadGoogleFont = useCallback(
    async (family: string) => {
      if (fonts.some((f) => f.family === family)) {
        return;
      }

      setLoading(family);

      const weights = [400, 500, 600, 700];
      const weightsStr = weights.join(";");
      const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsStr}&display=swap`;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;

      link.onload = () => {
        addGoogleFont(family, weights);
        setFontLoaded(family, true);
        setLoading(null);
      };

      link.onerror = () => {
        setLoading(null);
        console.error(`Failed to load font: ${family}`);
      };

      document.head.appendChild(link);
    },
    [fonts, addGoogleFont, setFontLoaded],
  );

  const handleAddCustom = () => {
    if (!fontInput.trim()) {
      return;
    }
    void loadGoogleFont(fontInput.trim());
    setFontInput("");
  };

  useEffect(() => {
    fonts
      .filter((f) => f.source === "google" && !f.loaded)
      .forEach((f) => {
        const weights = f.weights.join(";");
        const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@${weights}&display=swap`;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        link.onload = () => setFontLoaded(f.family, true);
        document.head.appendChild(link);
      });
  }, [fonts, setFontLoaded]);

  return (
    <div className="border-t border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Type className="size-4" />
        <span className="text-sm font-medium">Fonts</span>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto p-3">
        {/* Current fonts */}
        <div className="space-y-1">
          <Label className="text-xs">Available Fonts</Label>
          <div className="flex flex-wrap gap-1">
            {fonts.map((f) => (
              <span
                key={f.family}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                style={{ fontFamily: f.family }}
              >
                {f.family}
                {f.source === "bundled" && <span className="text-muted-foreground">(bundled)</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Quick add popular fonts */}
        <div>
          <Label className="text-xs">Add Google Fonts</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {POPULAR_GOOGLE_FONTS.filter((f) => !fonts.some((ef) => ef.family === f)).map(
              (family) => (
                <button
                  key={family}
                  onClick={() => loadGoogleFont(family)}
                  disabled={loading === family}
                  className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {loading === family ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : fonts.some((f) => f.family === family) ? (
                    <Check className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  {family}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Custom font input */}
        <div>
          <Label className="text-xs">Custom Google Font</Label>
          <div className="mt-1 flex gap-1">
            <Input
              value={fontInput}
              onChange={(e) => setFontInput(e.target.value)}
              placeholder="Font family name..."
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            />
            <Button
              size="sm"
              onClick={handleAddCustom}
              disabled={!fontInput.trim() || loading !== null}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the exact font name from{" "}
            <a
              href="https://fonts.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Fonts
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
