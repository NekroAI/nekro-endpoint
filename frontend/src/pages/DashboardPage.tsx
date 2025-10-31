import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Paper,
  useTheme,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  ExitToApp as LogoutIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { useAuth, fetchWithAuth } from "../hooks/useAuth";
import { RegenerateApiKeyResponseSchema } from "../../../common/validators/auth.schema";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

export function DashboardPage() {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: `${label} 已复制到剪贴板`,
      severity: "success",
    });
  };

  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetchWithAuth("/api/auth/regenerate-key", {
        method: "POST",
      });

      if (response.ok) {
        const data: z.infer<typeof RegenerateApiKeyResponseSchema> = await response.json();
        if (data.success && data.data) {
          setNewApiKey(data.data.apiKey);
          setSnackbar({
            open: true,
            message: "API Key 重新生成成功！",
            severity: "success",
          });
          // 刷新用户信息
          window.location.reload();
        } else {
          throw new Error(data.message || "重新生成失败");
        }
      } else {
        const errorData: any = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : "重新生成 API Key 失败",
        severity: "error",
      });
    } finally {
      setIsRegenerating(false);
      setRegenerateDialogOpen(false);
    }
  };

  const formatApiKey = (apiKey: string) => {
    if (!apiKey || apiKey.length <= 16) return apiKey;
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 8);
    const middle = "*".repeat(Math.max(0, apiKey.length - 16));
    return `${prefix}${middle}${suffix}`;
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="info">
          请先登录以访问控制台
          <Button onClick={() => navigate("/")} sx={{ ml: 2 }}>
            返回首页
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h3" component="h1">
          控制台
        </Typography>
        <Button startIcon={<LogoutIcon />} onClick={logout} variant="outlined" color="error">
          登出
        </Button>
      </Box>

      {/* 用户信息卡片 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar src={user.avatarUrl || undefined} alt={user.username} sx={{ width: 80, height: 80, mr: 3 }}>
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5">{user.username}</Typography>
              {user.email && (
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                注册时间: {new Date(user.createdAt).toLocaleString("zh-CN")}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">API 密钥</Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => setRegenerateDialogOpen(true)}
                variant="outlined"
                size="small"
              >
                重新生成
              </Button>
            </Box>

            {newApiKey ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                  新的 API Key 已生成！请立即保存，刷新后将无法再次查看完整密钥。
                </Typography>
                <Paper sx={{ p: 2, bgcolor: "success.light", color: "success.contrastText" }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      sx={{
                        fontFamily: "monospace",
                        flexGrow: 1,
                        wordBreak: "break-all",
                        fontSize: "0.875rem",
                      }}
                    >
                      {newApiKey}
                    </Typography>
                    <IconButton onClick={() => handleCopy(newApiKey, "新 API Key")} size="small" color="inherit">
                      <CopyIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Alert>
            ) : (
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  当前 API Key（部分隐藏）
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography sx={{ fontFamily: "monospace", flexGrow: 1, fontSize: "0.875rem" }}>
                    {formatApiKey(user.apiKey)}
                  </Typography>
                  <IconButton onClick={() => handleCopy(user.apiKey, "API Key")}>
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Paper>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>提示：</strong>
                请妥善保管您的 API Key，不要泄露给他人。如果您怀疑密钥已泄露，请立即重新生成。
              </Typography>
            </Alert>
          </Box>
        </CardContent>
      </Card>

      {/* 使用说明卡片 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            如何使用 API Key
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            您可以在需要认证的 API 请求中使用此 API Key。以下是一个示例：
          </Typography>
          <Paper
            sx={{
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              component="pre"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.875rem",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                color: theme.palette.mode === "dark" ? "grey.300" : "text.primary",
              }}
            >
              {`curl -H "Authorization: Bearer ${user.apiKey}" \\
  ${window.location.origin}/api/your-endpoint`}
            </Typography>
          </Paper>
        </CardContent>
      </Card>

      {/* 重新生成确认对话框 */}
      <Dialog open={regenerateDialogOpen} onClose={() => !isRegenerating && setRegenerateDialogOpen(false)}>
        <DialogTitle>确认重新生成 API Key？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography variant="body2" paragraph>
              重新生成 API Key 后，当前的 API Key 将立即失效。
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>警告：</strong>所有使用旧 API Key 的应用和服务将无法继续访问 API，您需要更新它们的配置。
            </Typography>
            <Typography variant="body2">确定要继续吗？</Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)} disabled={isRegenerating}>
            取消
          </Button>
          <Button onClick={handleRegenerateKey} color="error" variant="contained" disabled={isRegenerating}>
            {isRegenerating ? <CircularProgress size={20} /> : "确认重新生成"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
