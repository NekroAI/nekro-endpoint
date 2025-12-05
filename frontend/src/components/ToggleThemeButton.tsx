import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { IconButton } from "@mui/material";
import { useAppTheme } from "../context/ThemeContextProvider";

interface ToggleThemeButtonProps {
  size?: "small" | "medium" | "large";
}

export function ToggleThemeButton({ size = "medium" }: ToggleThemeButtonProps) {
  const { themeMode, toggleTheme } = useAppTheme();
  return (
    <IconButton sx={{ ml: size === "small" ? 0 : 1 }} onClick={toggleTheme} color="inherit" size={size}>
      {themeMode === "dark" ? <Brightness7Icon fontSize={size} /> : <Brightness4Icon fontSize={size} />}
    </IconButton>
  );
}
