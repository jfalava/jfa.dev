(() => {
  const root = document.documentElement;
  const preferenceCookie = "jfa-theme";

  const readCookie = (name) => {
    const prefix = `${name}=`;
    const cookie = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(prefix));

    if (!cookie) {
      return null;
    }

    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch (_error) {
      return null;
    }
  };

  const setTheme = (isDark) => {
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  };

  try {
    const theme = readCookie(preferenceCookie) ?? "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(theme === "dark" || (theme === "system" && prefersDark));
  } catch (_error) {
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
})();
