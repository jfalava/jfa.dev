import { createCn } from "cn/config";

/** Class merging that knows the custom font sizes from styles.css, so text-kbd is not a color. */
export const cn = createCn({
  extend: { classGroups: { "font-size": [{ text: ["label", "kbd", "kbd-xs"] }] } },
});
