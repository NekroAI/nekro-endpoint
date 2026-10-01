import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, type PaletteMode } from "@mui/material";
import { lightTheme, darkTheme } from "../theme";
import { safeLocalStorage, isBrowser } from "../utils/storage";

/**
 * Single source of truth for the colour scheme.
 *
 * The Signal UI reads the scheme from CSS variables selected by
 * <html data-theme>; this provider only owns the preference and keeps that
 * attribute (set before paint by THEME_BOOT_SCRIPT) in sync. The MUI theme is
 * provided for legacy pages until they are removed.
 */
type AppThemeContextType = {
  themeMode: PaletteMode;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType>({
  themeMode: "dark",
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(AppThemeContext);

function readInitialMode(): PaletteMode {
  if (!isBrowser) return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<PaletteMode>(readInitialMode);

  const toggleTheme = useCallback(() => {
    setThemeMode((previous) => {
      const next = previous === "light" ? "dark" : "light";
      if (isBrowser) {
        document.documentElement.dataset.theme = next;
        safeLocalStorage.setItem("themeMode", next);
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ themeMode, toggleTheme }), [themeMode, toggleTheme]);
  const muiTheme = themeMode === "light" ? lightTheme : darkTheme;

  return (
    <AppThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </AppThemeContext.Provider>
  );
};
