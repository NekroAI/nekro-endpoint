import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import { AdminPanelSettings as AdminIcon, Person as PersonIcon } from "@mui/icons-material";
import { getApiBase } from "../../../common/config/api";

const API_BASE = getApiBase();

interface User {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export function InitPage() {
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkInitStatus();
  }, []);

  const checkInitStatus = async () => {
    try {
      // 检查是否需要初始化
      const checkResponse = await fetch(`${API_BASE}/api/init/check`);

      if (!checkResponse.ok) {
        const errorData = (await checkResponse.json()) as {
          success?: boolean;
          message?: string;
        };
        setError(errorData.message || `检查失败: ${checkResponse.status}`);
        setIsLoading(false);
        return;
      }

      const checkData = (await checkResponse.json()) as {
        success: boolean;
        needsInit: boolean;
        message: string;
      };

      if (!checkData.needsInit) {
        // 系统已初始化，重定向到首页
        window.location.href = "/";
        return;
      }

      // 加载用户列表
      loadUsers();
    } catch (err) {
      setError("检查系统状态失败: " + ((err as Error).message || "未知错误"));
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/init/users`);
      const data = (await response.json()) as {
        success: boolean;
        data?: {
          users: User[];
          total: number;
        };
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "获取用户列表失败");
      }

      setUsers(data.data?.users || []);
    } catch (err) {
      setError((err as Error).message || "获取用户列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 移除轮询逻辑 - 不再需要自动刷新用户列表

  const handleSetAdmin = async () => {
    if (!selectedUserId) {
      setError("请选择一个用户");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/init/set-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "设置管理员失败");
      }

      setSuccess(true);

      // 3秒后重定向到首页
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      setError((err as Error).message || "设置管理员失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: theme.palette.background.default,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            bgcolor: theme.palette.background.paper,
          }}
        >
          <AdminIcon sx={{ fontSize: 64, color: theme.palette.success.main, mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.primary">
            管理员设置成功！
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            系统已初始化，正在跳转到首页...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: theme.palette.background.default,
        py: 4,
        m: 0,
      }}
    >
      <Container maxWidth="md">
        <Paper
          sx={{
            p: 4,
            bgcolor: theme.palette.background.paper,
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <AdminIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h4" gutterBottom color="text.primary">
              系统初始化
            </Typography>
            <Typography variant="body1" color="text.secondary">
              欢迎使用 NekroEndpoint！请为系统分配第一个管理员。
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {users.length === 0 ? (
            <Card sx={{ mb: 3, bgcolor: theme.palette.background.paper }}>
              <CardContent>
                <Alert severity="info">
                  <Typography variant="body1" gutterBottom color="text.primary">
                    <strong>暂无用户</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    系统需要至少一个用户才能分配管理员。请先通过 GitHub OAuth 注册一个用户。
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PersonIcon />}
                    sx={{ mt: 2 }}
                    onClick={async () => {
                      try {
                        // 获取 GitHub OAuth URL
                        const response = await fetch(`${API_BASE}/api/auth/github`);
                        const data = (await response.json()) as {
                          success: boolean;
                          data?: {
                            authUrl: string;
                            state: string;
                          };
                          message?: string;
                        };

                        if (data.success && data.data?.authUrl) {
                          // 保存初始化页面的状态，登录后返回
                          sessionStorage.setItem("init_return", "true");
                          window.location.href = data.data.authUrl;
                        } else {
                          setError("获取登录链接失败");
                        }
                      } catch (err) {
                        setError("获取登录链接失败");
                      }
                    }}
                  >
                    使用 GitHub 登录注册
                  </Button>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }} color="text.primary">
                选择管理员用户
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                请从以下用户中选择一个作为系统管理员。该用户将被自动激活。
              </Typography>

              <List>
                {users.map((user) => (
                  <ListItem
                    key={user.id}
                    button
                    selected={selectedUserId === user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: selectedUserId === user.id ? 2 : 1,
                      borderColor: selectedUserId === user.id ? theme.palette.primary.main : theme.palette.divider,
                      bgcolor: theme.palette.background.paper,
                      "&:hover": {
                        bgcolor: theme.palette.action.hover,
                      },
                      "&.Mui-selected": {
                        bgcolor: theme.palette.action.selected,
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={user.avatarUrl || undefined}>{user.username.charAt(0).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.username}
                      primaryTypographyProps={{ color: "text.primary" }}
                      secondary={user.email || `注册时间: ${new Date(user.createdAt).toLocaleString()}`}
                      secondaryTypographyProps={{ color: "text.secondary" }}
                    />
                    {selectedUserId === user.id && <AdminIcon color="primary" />}
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AdminIcon />}
                  onClick={handleSetAdmin}
                  disabled={!selectedUserId || isSubmitting}
                >
                  {isSubmitting ? "设置中..." : "设置为管理员"}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
