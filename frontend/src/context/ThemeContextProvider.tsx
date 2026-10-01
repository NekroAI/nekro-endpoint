import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, type PaletteMode } from "@mui/material";
import { lightTheme, darkTheme } from "../theme";
import { safeLocalStorage, isBrowser } from "../utils/storage";

/**
 * Single source of truth for the colour scheme.
 *
 * The Signal UI reads the scheme from CSS variables selected by
 * <html data-theme>; this provider owns the preference ("dark" | "light" |
 * "system", stored as `themeMode`) and keeps that attribute (set before paint
 * by THEME_BOOT_SCRIPT) in sync. The MUI theme is provided for legacy pages
 * until they are removed.
 */
export type ThemePreference = PaletteMode | "system";

type AppThemeContextType = {
  /** The resolved scheme currently on screen. */
  themeMode: PaletteMode;
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

const systemMode = (): PaletteMode =>
  isBrowser && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

function readPreference(): ThemePreference {
  const stored = safeLocalStorage.getItem("themeMode");
  return stored === "light" || stored === "system" ? stored : "dark";
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => (isBrowser ? readPreference() : "dark"));
  const [themeMode, setThemeMode] = useState<PaletteMode>(() =>
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
  const muiTheme = themeMode === "light" ? lightTheme : darkTheme;

  return (
    <AppThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </AppThemeContext.Provider>
  );
};
