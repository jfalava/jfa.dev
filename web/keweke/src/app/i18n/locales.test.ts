import { describe, expect, test } from "bun:test";

import { negotiateLocale } from "./locales";

describe("negotiateLocale", () => {
  test("prefers the saved jfa-language cookie over the browser languages", () => {
    expect(negotiateLocale("jfa-theme=dark; jfa-language=ca-ES", "es-ES,es;q=0.9")).toBe("ca-ES");
  });

  test("matches a jfa-language cookie that holds only a language subtag", () => {
    expect(negotiateLocale("jfa-language=es", "ca,en;q=0.5")).toBe("es-ES");
  });

  test("ignores a cookie for a locale Keweke does not ship", () => {
    expect(negotiateLocale("jfa-language=fr-FR", "es-MX,en;q=0.5")).toBe("es-ES");
  });

  test("picks the highest-quality supported browser language, not the first listed", () => {
    expect(negotiateLocale(null, "fr-FR;q=0.9, en;q=0.4, ca;q=0.8")).toBe("ca-ES");
  });

  test("skips languages the browser refuses with q=0", () => {
    expect(negotiateLocale(null, "es;q=0, ca-ES;q=0.2")).toBe("ca-ES");
  });

  test("falls back to English when nothing matches", () => {
    expect(negotiateLocale(null, "de-DE,fr;q=0.8")).toBe("en-US");
    expect(negotiateLocale(null, null)).toBe("en-US");
  });
});
