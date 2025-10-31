import { createContext, useState, useMemo, useContext, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme, type PaletteMode } from "@mui/material";
import { lightTheme, darkTheme } from "../theme";
import { useCallback } from "react";

type AppThemeContextType = {
  themeMode: PaletteMode;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType>({
  themeMode: "dark",
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(AppThemeContext);

const isBrowser = typeof window !== "undefined";

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeMode] = useState<PaletteMode>(() => {
    if (!isBrowser) return "dark";
    try {
      const storedMode = localStorage.getItem("themeMode");
      if (storedMode) {
        return storedMode as PaletteMode;
      }
      return "dark"; // Default to dark mode
    } catch (error) {
      // If localStorage is not available (e.g., in SSR or private mode), default to dark
      return "dark";
    }
  });

  const toggleTheme = useCallback(() => {
    setThemeMode((prevMode: PaletteMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      if (isBrowser) {
        try {
          localStorage.setItem("themeMode", newMode);
        } catch (error) {
          // Handle potential errors if localStorage is not available
          console.error("Failed to save theme mode to localStorage", error);
        }
      }
      return newMode;
    });
  }, []);

  const theme = useMemo(() => (themeMode === "light" ? lightTheme : darkTheme), [themeMode]);

  return (
    <AppThemeContext.Provider value={{ themeMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </AppThemeContext.Provider>
  );
};
