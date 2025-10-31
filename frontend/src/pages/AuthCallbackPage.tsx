import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthResponseSchema, UserInfoSchema } from "../../../common/validators/auth.schema";
import { useRef } from "react";
import { z } from "zod";
import { safeLocalStorage } from "../utils/storage";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { refetch } = useAuth();
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing.current) {
        return;
      }
      isProcessing.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code || !state) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch(`/api/auth/github/callback?code=${code}&state=${state}`);
        const data: z.infer<typeof AuthResponseSchema> = await response.json();

        if (data.success && data.data) {
          // 1. 设置 token 到 localStorage (会触发 auth_token_changed 事件)
          safeLocalStorage.setItem("auth_token", data.data.sessionToken);
          // 2. 设置用户数据到 QueryClient 缓存
          queryClient.setQueryData<z.infer<typeof UserInfoSchema>>(["auth", "user"], data.data.user);
          // 3. 触发 refetch 以确保状态同步
          await refetch();
          // 4. 导航到控制台页面
          navigate("/dashboard");
        } else {
          console.error("Authentication failed:", data.message);
          navigate("/");
        }
      } catch (error) {
        console.error("Error during auth callback:", error);
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [location, navigate, queryClient, refetch]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>正在验证您的身份，请稍候...</Typography>
    </Box>
  );
}
