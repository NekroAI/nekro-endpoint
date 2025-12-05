import {
  AppBar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
  CssBaseline,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Dashboard as WorkspaceIcon, ExitToApp as LogoutIcon, GitHub as GitHubIcon } from "@mui/icons-material";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Footer } from "./components/Footer";
import { NekroEndpointLogo } from "./assets/logos";
import { ToggleThemeButton } from "./components/ToggleThemeButton";
import { useAuth } from "./hooks/useAuth";

function App() {
  const location = useLocation();
  const theme = useTheme();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          color: theme.palette.text.primary,
          backgroundColor: theme.appBar.background,
          backdropFilter: "blur(12px) saturate(180%)",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: "flex",
                alignItems: "center",
                mr: 2,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <NekroEndpointLogo height={32} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  ml: 1.5,
                  display: { xs: "none", md: "flex" },
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                NekroEndpoint
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* 导航链接 */}
            <Button
              component={RouterLink}
              to="/docs"
              sx={{
                my: 2,
                color: "inherit",
                display: "block",
                fontWeight: location.pathname === "/docs" ? "bold" : "normal",
              }}
            >
              使用文档
            </Button>
            {isAuthenticated && (
              <Button
                component={RouterLink}
                to="/dashboard"
                sx={{
                  my: 2,
                  color: "inherit",
                  display: "block",
                  fontWeight: ["/dashboard", "/endpoints", "/permissions", "/admin/users"].includes(location.pathname)
                    ? "bold"
                    : "normal",
                }}
              >
                工作台
              </Button>
            )}

            <ToggleThemeButton />

            {/* 用户认证区域 */}
            {isLoading ? (
              <CircularProgress size={20} sx={{ ml: 2 }} />
            ) : isAuthenticated ? (
              <>
                <IconButton
                  size="large"
                  aria-label="用户菜单"
                  aria-controls="user-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  <Avatar src={user?.avatarUrl || undefined} alt={user?.username} sx={{ width: 32, height: 32 }}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <MenuItem onClick={handleMenuClose} component={RouterLink} to="/dashboard">
                    <WorkspaceIcon sx={{ mr: 1, fontSize: 20 }} />
                    工作台
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    登出
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button onClick={login} startIcon={<GitHubIcon />} variant="outlined" sx={{ ml: 2 }}>
                GitHub 登录
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
}

export default App;
