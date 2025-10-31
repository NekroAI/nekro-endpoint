import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    pageBackground: string;
    appBar: {
      background: string;
    };
    glass: {
      background: string;
    };
    hero: {
      background: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    pageBackground?: string;
    appBar?: {
      background?: string;
    };
    glass?: {
      background?: string;
    };
    hero?: {
      background?: string;
    };
  }
}
