import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  CheckCircle as ActivateIcon,
  Block as DeactivateIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle,
  Block,
} from "@mui/icons-material";
import { useAdminUsers, useActivateUser, useDeactivateUser, useDeleteUser, useAdminStats } from "../../hooks/useAdmin";
import { useAuth } from "../../hooks/useAuth";

export function AdminUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"user" | "admin" | "">("");
  const [activatedFilter, setActivatedFilter] = useState<"true" | "false" | "">("");

  const { data, isLoading, error } = useAdminUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    isActivated: activatedFilter ? activatedFilter === "true" : undefined,
  });
  const { data: statsData } = useAdminStats();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const deleteUser = useDeleteUser();

  if (!user || user.role !== "admin") {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">您没有管理员权限</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">加载失败: {(error as Error).message}</Alert>
      </Container>
    );
  }

  const users = (data as any)?.data?.users || [];
  const stats = (statsData as any)?.data;

  const handleActivate = async (userId: string) => {
    const targetUser = users.find((u: any) => u.id === userId);
    if (window.confirm(`激活用户 "${targetUser?.username}"？\n\n该用户将可以发布端点到公网。`)) {
      try {
        await activateUser.mutateAsync(userId);
      } catch (err) {
        alert("激活失败: " + (err as Error).message);
      }
    }
  };

  const handleDeactivate = async (userId: string) => {
    const targetUser = users.find((u: any) => u.id === userId);
    if (
      window.confirm(
        `停用用户 "${targetUser?.username}"？\n\n该用户的所有已发布端点将立即无法访问。\n可随时重新激活恢复访问。`,
      )
    ) {
      try {
        await deactivateUser.mutateAsync(userId);
      } catch (err) {
        alert("停用失败: " + (err as Error).message);
      }
    }
  };

  const handleDelete = async (userId: string) => {
    const targetUser = users.find((u: any) => u.id === userId);
    if (
      window.confirm(
        `⚠️ 删除用户 "${targetUser?.username}"？\n\n将永久删除：\n• 用户账号\n• 所有端点\n• 所有权限组和访问密钥\n\n此操作不可逆！`,
      )
    ) {
      try {
        await deleteUser.mutateAsync(userId);
      } catch (err) {
        alert("删除失败: " + (err as Error).message);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1">
          用户管理
        </Typography>
      </Box>

      {stats && (
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              总用户数
            </Typography>
            <Typography variant="h5">{stats.totalUsers}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              已激活
            </Typography>
            <Typography variant="h5">{stats.activatedUsers}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              总端点数
            </Typography>
            <Typography variant="h5">{stats.totalEndpoints}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              已发布端点
            </Typography>
            <Typography variant="h5">{stats.publishedEndpoints}</Typography>
          </Paper>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="搜索用户名或邮箱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>角色</InputLabel>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} label="角色">
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="user">用户</MenuItem>
              <MenuItem value="admin">管理员</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>激活状态</InputLabel>
            <Select
              value={activatedFilter}
              onChange={(e) => setActivatedFilter(e.target.value as any)}
              label="激活状态"
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="true">已激活</MenuItem>
              <MenuItem value="false">未激活</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>用户名</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>激活状态</TableCell>
              <TableCell>最后登录</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">没有找到用户</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role === "admin" ? "管理员" : "用户"}
                      color={u.role === "admin" ? "primary" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {u.isActivated ? (
                      <Chip
                        icon={<CheckCircle fontSize="small" />}
                        label="已激活"
                        color="success"
                        size="small"
                        variant="filled"
                      />
                    ) : (
                      <Chip
                        icon={<Block fontSize="small" />}
                        label="未激活"
                        color="default"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}</TableCell>
                  <TableCell align="right">
                    {u.id !== user?.id ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {!u.isActivated ? (
                          <Tooltip title="允许用户发布端点并使其可访问">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<ActivateIcon />}
                              onClick={() => handleActivate(u.id)}
                              disabled={activateUser.isPending}
                            >
                              激活
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip title="该用户所有端点将立即无法访问">
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<DeactivateIcon />}
                              onClick={() => handleDeactivate(u.id)}
                              disabled={deactivateUser.isPending}
                            >
                              停用
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="永久删除用户及其所有数据">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDelete(u.id)}
                            disabled={deleteUser.isPending}
                          >
                            删除
                          </Button>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        (当前用户)
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
