import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { IconButton } from "@mui/material";
import { useAppTheme } from "../context/ThemeContextProvider";

export function ToggleThemeButton() {
  const { themeMode, toggleTheme } = useAppTheme();
  return (
    <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
      {themeMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}
