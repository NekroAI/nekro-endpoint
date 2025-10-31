import { createTheme } from "@mui/material";
import "./types.ts";

export const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
  pageBackground: "linear-gradient(180deg, #ffffff 0%, #eaf2f8 100%)",
  appBar: {
    background: "rgba(255, 255, 255, 0.75)",
  },
  glass: {
    background: "rgba(255, 255, 255, 0.7)",
  },
  hero: {
    background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 128, 255, 0.2), hsla(0, 0%, 100%, 0))`,
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  pageBackground: "linear-gradient(180deg, #121212 0%, #1a1a2e 100%)",
  appBar: {
    background: "rgba(20, 20, 22, 0.75)",
  },
  glass: {
    background: "rgba(20, 20, 22, 0.7)",
  },
  hero: {
    background: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), hsla(0, 0%, 100%, 0))`,
  },
});
