/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      screens: {
        "ultrawide-only": { min: "1920px" },
        "not-ultrawide": { max: "1920px" },
        "w-1150": { max: "1149px" },
        "mw-1150": { min: "1150px" },
        "not-mobile": { min: "725px" },
        "mobile-only": { max: "725px" },
      },
    },
  },
};
