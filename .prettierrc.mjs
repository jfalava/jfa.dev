/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "./astro-landing/*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
