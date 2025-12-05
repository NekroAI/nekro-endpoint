import {
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Typography,
  ListItemIcon,
  alpha,
  Tooltip,
} from "@mui/material";
import {
  ExitToApp as LogoutIcon,
  Description as DocsIcon,
  Dashboard as DashboardIcon,
  AdminPanelSettings as AdminIcon,
  Storage as EndpointsIcon,
  VpnKey as PermissionsIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { NekroEndpointLogo } from "../assets/logos";
import { useAuth } from "../hooks/useAuth";
import { useAppTheme } from "../context/ThemeContextProvider";

export function WorkspaceTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box
      sx={{
        height: "40px",
        display: "flex",
        alignItems: "center",
        px: 2,
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.50"),
        borderBottom: 1,
        borderColor: "divider",
        gap: 2,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Box
        component={RouterLink}
        to="/"
        sx={{
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
          gap: 1,
          "&:hover": { opacity: 0.8 },
        }}
      >
        <NekroEndpointLogo height={20} width={20} />
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          NekroEndpoint
        </Typography>
      </Box>

      {/* 导航按钮 */}
      <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
        <Button
          component={RouterLink}
          to="/dashboard"
          size="small"
          startIcon={<DashboardIcon sx={{ fontSize: "1rem !important" }} />}
          sx={{
            minWidth: "auto",
            px: 1.5,
            py: 0.5,
            fontSize: "0.8125rem",
            fontWeight: isActive("/dashboard") ? 600 : 400,
            color: isActive("/dashboard") ? "primary.main" : "text.primary",
            bgcolor: isActive("/dashboard") ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            },
          }}
        >
          控制台
        </Button>

        <Button
          component={RouterLink}
          to="/endpoints"
          size="small"
          startIcon={<EndpointsIcon sx={{ fontSize: "1rem !important" }} />}
          sx={{
            minWidth: "auto",
            px: 1.5,
            py: 0.5,
            fontSize: "0.8125rem",
            fontWeight: isActive("/endpoints") ? 600 : 400,
            color: isActive("/endpoints") ? "primary.main" : "text.primary",
            bgcolor: isActive("/endpoints") ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            },
          }}
        >
          端点管理
        </Button>

        <Button
          component={RouterLink}
          to="/permissions"
          size="small"
          startIcon={<PermissionsIcon sx={{ fontSize: "1rem !important" }} />}
          sx={{
            minWidth: "auto",
            px: 1.5,
            py: 0.5,
            fontSize: "0.8125rem",
            fontWeight: isActive("/permissions") ? 600 : 400,
            color: isActive("/permissions") ? "primary.main" : "text.primary",
            bgcolor: isActive("/permissions") ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            },
          }}
        >
          权限组
        </Button>

        {user?.role === "admin" && (
          <Button
            component={RouterLink}
            to="/admin/users"
            size="small"
            startIcon={<AdminIcon sx={{ fontSize: "1rem !important" }} />}
            sx={{
              minWidth: "auto",
              px: 1.5,
              py: 0.5,
              fontSize: "0.8125rem",
              fontWeight: isActive("/admin/users") ? 600 : 400,
              color: isActive("/admin/users") ? "primary.main" : "text.primary",
              bgcolor: isActive("/admin/users") ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              },
            }}
          >
            管理后台
          </Button>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* 右侧工具栏 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* 文档 */}
        <Tooltip title="使用文档">
          <IconButton
            component={RouterLink}
            to="/docs"
            size="small"
            sx={{
              width: 28,
              height: 28,
            }}
          >
            <DocsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <IconButton
          size="small"
          onClick={toggleTheme}
          sx={{
            width: 28,
            height: 28,
          }}
        >
          {themeMode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
        </IconButton>

        {/* 用户头像 */}
        <IconButton
          size="small"
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            width: 28,
            height: 28,
            p: 0,
          }}
        >
          <Avatar
            src={user?.avatarUrl || undefined}
            alt={user?.username}
            sx={{
              width: 24,
              height: 24,
              fontSize: "0.75rem",
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>

        {/* 用户菜单 */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
            {user?.role === "admin" && (
              <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.5 }}>
                管理员
              </Typography>
            )}
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              logout();
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            登出
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
