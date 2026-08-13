(() => {
  const root = document.documentElement;
  const setTheme = (isDark) => {
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      return;
    }

    root.classList.remove("dark");
    root.style.colorScheme = "light";
  };

  try {
    const theme = localStorage.getItem("theme") ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(theme === "dark" || (theme === "system" && prefersDark));
  } catch (_error) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark);
  }
})();
