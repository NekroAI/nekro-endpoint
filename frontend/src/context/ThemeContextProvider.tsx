import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { safeLocalStorage, isBrowser } from "../utils/storage";

/**
 * Single source of truth for the colour scheme.
 *
 * Components read colours from CSS variables selected by <html data-theme>
 * (design/tokens.css); this provider owns the preference ("dark" | "light" |
 * "system", stored as `themeMode`) and keeps that attribute — set before
 * first paint by THEME_BOOT_SCRIPT — in sync. Only libraries that cannot read
 * CSS variables (Monaco, sonner) consume `themeMode`.
 */
export type ThemeMode = "dark" | "light";
export type ThemePreference = ThemeMode | "system";

type AppThemeContextType = {
  /** The resolved scheme currently on screen. */
  themeMode: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType>({
  themeMode: "dark",
  preference: "dark",
  setPreference: () => {},
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(AppThemeContext);

const systemMode = (): ThemeMode =>
  isBrowser && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

function readPreference(): ThemePreference {
  const stored = safeLocalStorage.getItem("themeMode");
  return stored === "light" || stored === "system" ? stored : "dark";
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => (isBrowser ? readPreference() : "dark"));
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    isBrowser && document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  useEffect(() => {
    const apply = () => {
      const resolved = preference === "system" ? systemMode() : preference;
      document.documentElement.dataset.theme = resolved;
      setThemeMode(resolved);
    };
    apply();
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    safeLocalStorage.setItem("themeMode", next);
    setPreferenceState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(themeMode === "light" ? "dark" : "light");
  }, [setPreference, themeMode]);

  const value = useMemo(
    () => ({ themeMode, preference, setPreference, toggleTheme }),
    [themeMode, preference, setPreference, toggleTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};
