import { Plus, Check, Loader2, Type } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [fontInput, setFontInput] = useState("");
  const [externalFamily, setExternalFamily] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const fonts = useEditorStore((s) => s.fonts);
  const addGoogleFont = useEditorStore((s) => s.addGoogleFont);
  const addExternalFont = useEditorStore((s) => s.addExternalFont);
  const setFontLoaded = useEditorStore((s) => s.setFontLoaded);

  const loadStylesheet = useCallback(
    (url: string, family: string, onComplete?: (loaded: boolean) => void) => {
      const ownerDocument = rootRef.current?.ownerDocument;
      if (!ownerDocument) {
        return;
      }

      const existing = ownerDocument.querySelector<HTMLLinkElement>(
        `link[rel="stylesheet"][href="${CSS.escape(url)}"]`,
      );
      if (existing) {
        setFontLoaded(family, true);
        onComplete?.(true);
        return;
      }

      const link = ownerDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.addEventListener("load", () => {
        setFontLoaded(family, true);
        onComplete?.(true);
      });
      link.addEventListener("error", () => {
        onComplete?.(false);
        console.error(`Failed to load font stylesheet: ${url}`);
      });
      ownerDocument.head.appendChild(link);
    },
    [setFontLoaded],
  );

  const loadGoogleFont = useCallback(
    async (family: string) => {
      if (fonts.some((f) => f.family === family)) {
        return;
      }

      setLoading(family);

      const weights = [400, 500, 600, 700];
      const weightsStr = weights.join(";");
      const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsStr}&display=swap`;

      loadStylesheet(url, family, (loaded) => {
        if (loaded) {
          addGoogleFont(family, weights);
        }
        setLoading(null);
      });
    },
    [fonts, addGoogleFont, loadStylesheet],
  );

  const handleAddCustom = () => {
    if (!fontInput.trim()) {
      return;
    }
    void loadGoogleFont(fontInput.trim());
    setFontInput("");
  };

  const handleAddExternal = () => {
    const family = externalFamily.trim();
    const url = externalUrl.trim();
    if (!family || !url) {
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }

    const normalizedUrl = parsedUrl.toString();
    if (fonts.some((font) => font.family === family || font.stylesheetUrl === normalizedUrl)) {
      return;
    }

    setLoading(family);
    loadStylesheet(normalizedUrl, family, (loaded) => {
      if (loaded) {
        addExternalFont(family, normalizedUrl);
      }
      setLoading(null);
    });
    setExternalFamily("");
    setExternalUrl("");
  };

  useEffect(() => {
    fonts
      .filter((font) => !font.loaded)
      .forEach((font) => {
        if (font.source === "google") {
          const weights = font.weights.length > 0 ? `:wght@${font.weights.join(";")}` : "";
          const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}${weights}&display=swap`;
          loadStylesheet(url, font.family);
          return;
        }

        if (font.source === "external" && font.stylesheetUrl) {
          loadStylesheet(font.stylesheetUrl, font.family);
        }
      });
  }, [fonts, loadStylesheet]);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col border-t border-border/60">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Type className="size-4" />
        <span className="text-sm font-medium">Fonts</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
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

        <div>
          <Label className="text-xs">External Stylesheet Font</Label>
          <div className="mt-1 space-y-2">
            <Input
              value={externalFamily}
              onChange={(e) => setExternalFamily(e.target.value)}
              placeholder="Font family name (e.g. Pretendard)"
            />
            <div className="flex gap-1">
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://.../font.css"
                onKeyDown={(e) => e.key === "Enter" && handleAddExternal()}
              />
              <Button
                size="sm"
                onClick={handleAddExternal}
                disabled={!externalFamily.trim() || !externalUrl.trim() || loading !== null}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a CSS URL that declares the font-face and the family name you will use.
          </p>
        </div>
      </div>
    </div>
  );
}
