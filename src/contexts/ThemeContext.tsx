import { createContext, useContext, useEffect, useState } from "react";
import { applyTheme, DEFAULT_THEME, THEMES, type ThemeKey } from "@/lib/themes";

interface ThemeCtx {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  themes: typeof THEMES;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "app-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    return saved && THEMES.some((t) => t.key === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}