(() => {
  const root = document.documentElement;

  const setTheme = (isDark) => {
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  };

  try {
    const theme = localStorage.getItem("theme") ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(theme === "dark" || (theme === "system" && prefersDark));
  } catch (_error) {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
})();
