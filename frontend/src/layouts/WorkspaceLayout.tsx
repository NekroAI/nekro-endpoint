import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import { WorkspaceTopBar } from "../components/WorkspaceTopBar";

/**
 * 工作区布局 - 用于端点管理、权限组等专业工具页面
 * 特点：
 * - 紧凑的 macOS 风格顶栏
 * - 无页脚
 * - 占满整个视口
 * - 内部管理滚动，避免整页滚动
 */
export function WorkspaceLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <CssBaseline />
      <WorkspaceTopBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}


