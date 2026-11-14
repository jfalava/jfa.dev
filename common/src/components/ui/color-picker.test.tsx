import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ColorField } from "./color-picker";

test("ColorField disables its named color control only when requested", () => {
  for (const disabled of [false, true]) {
    const markup = renderToStaticMarkup(
      <ColorField label="Artwork accent" value="#2468ac" onChange={mock()} disabled={disabled} />,
    );
    expect(markup).toContain('aria-label="Artwork accent"');
    expect(markup.includes('disabled=""')).toBe(disabled);
  }
});
