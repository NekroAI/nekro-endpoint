import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  Snackbar,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  AccessTime as AccessTimeIcon,
  Shield as ShieldIcon,
} from "@mui/icons-material";
import { usePermissionGroups, useCreatePermissionGroup, useDeletePermissionGroup } from "../hooks/usePermissionGroups";
import { useAccessKeys, useCreateAccessKey, useUpdateAccessKey, useDeleteAccessKey } from "../hooks/useAccessKeys";
import { useAuth } from "../hooks/useAuth";

// 快捷到期时间选项（天数）
const EXPIRY_PRESETS = [
  { label: "1 天", days: 1 },
  { label: "7 天", days: 7 },
  { label: "15 天", days: 15 },
  { label: "30 天", days: 30 },
  { label: "90 天", days: 90 },
  { label: "180 天", days: 180 },
  { label: "365 天", days: 365 },
  { label: "730 天（2年）", days: 730 },
  { label: "永久", days: null },
];

// 延期选项（天数）
const EXTEND_PRESETS = [
  { label: "7 天", days: 7 },
  { label: "30 天", days: 30 },
  { label: "90 天", days: 90 },
  { label: "180 天", days: 180 },
  { label: "365 天", days: 365 },
];

// 隐藏密钥的中间部分
function maskKey(key: string): string {
  if (key.length <= 10) return key;
  const prefix = key.substring(0, 6);
  const suffix = key.substring(key.length - 4);
  return `${prefix}${"*".repeat(Math.min(12, key.length - 10))}${suffix}`;
}

export function PermissionGroupsPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = usePermissionGroups();
  const createGroup = useCreatePermissionGroup();
  const deleteGroup = useDeletePermissionGroup();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">请先登录</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 64px)" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">加载失败: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const groups = (data as any)?.data?.groups || [];
  const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setSnackbar({ open: true, message: "请输入权限组名称", severity: "error" });
      return;
    }

    try {
      await createGroup.mutateAsync({
        name: newGroupName,
        description: newGroupDesc || undefined,
      });
      setCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setSnackbar({ open: true, message: "权限组创建成功", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `创建失败: ${(err as Error).message}`, severity: "error" });
    }
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;

    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: `确定要删除权限组 "${selectedGroup.name}" 吗？该权限组的所有访问密钥也会被删除。`,
      onConfirm: async () => {
        try {
          await deleteGroup.mutateAsync(selectedGroup.id);
          setSelectedGroupId(null);
          setSnackbar({ open: true, message: "权限组删除成功", severity: "success" });
        } catch (err) {
          setSnackbar({ open: true, message: `删除失败: ${(err as Error).message}`, severity: "error" });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* 左侧：权限组列表 */}
      <Paper
        elevation={1}
        sx={{
          width: 320,
          borderRadius: 0,
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          bgcolor: (theme) => theme.palette.background.default,
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: (theme) => theme.palette.background.paper,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              权限组
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ borderRadius: 1.5 }}
            >
              新建
            </Button>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          {groups.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, px: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "grey.100"),
                  mx: "auto",
                  mb: 2,
                }}
              >
                <ShieldIcon sx={{ fontSize: 32, color: "text.disabled" }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                还没有权限组
              </Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                创建第一个权限组
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {groups.map((group: any) => (
                <ListItem key={group.id} disablePadding>
                  <ListItemButton
                    selected={selectedGroupId === group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                        "&:hover": {
                          bgcolor: "action.selected",
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <ShieldIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: selectedGroupId === group.id ? 600 : 400 }}>
                          {group.name}
                        </Typography>
                      }
                      secondary={
                        group.description ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                            }}
                          >
                            {group.description}
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* 右侧：密钥管理 */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedGroup ? (
          <>
            {/* 顶部信息栏 */}
            <Paper
              elevation={0}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 2 }}>
                {/* 左侧：图标 + 信息 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "primary.main",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    <ShieldIcon />
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}>
                      {selectedGroup.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {selectedGroup.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {selectedGroup.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        创建于 {new Date(selectedGroup.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 右侧：操作按钮 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  <Tooltip title="删除权限组">
                    <IconButton size="small" color="error" onClick={handleDeleteGroup}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>

            {/* 密钥列表 */}
            <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
              <AccessKeysPanel
                groupId={selectedGroup.id}
                onSnackbar={(message) => setSnackbar({ open: true, message, severity: "success" })}
              />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              bgcolor: "background.default",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "grey.100"),
              }}
            >
              <ShieldIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5 }}>
                选择一个权限组
              </Typography>
              <Typography variant="body2" color="text.disabled">
                从左侧列表中选择权限组管理访问密钥
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 创建权限组对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建权限组</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="权限组名称"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="描述（可选）"
            fullWidth
            multiline
            rows={3}
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>取消</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color="error">
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar 提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}

// 访问密钥管理面板
function AccessKeysPanel({ groupId, onSnackbar }: { groupId: string; onSnackbar: (message: string) => void }) {
  const { data, isLoading } = useAccessKeys(groupId);
  const createKey = useCreateAccessKey();
  const updateKey = useUpdateAccessKey();
  const deleteKey = useDeleteAccessKey();

  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [editKeyDialogOpen, setEditKeyDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<any>(null);
  const [keyDescription, setKeyDescription] = useState("");
  const [expiryType, setExpiryType] = useState<"preset" | "custom" | "never" | "extend">("preset");
  const [expiryPreset, setExpiryPreset] = useState(30);
  const [extendDays, setExtendDays] = useState(30);
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const handleCreateKey = async () => {
    try {
      let expiresAt: Date | undefined;

      if (expiryType === "preset") {
        const days = expiryPreset;
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      } else if (expiryType === "custom" && customExpiryDate) {
        expiresAt = new Date(customExpiryDate);
      }

      const result: any = await createKey.mutateAsync({
        groupId,
        description: keyDescription || undefined,
        expiresAt: expiresAt?.toISOString(),
      });

      setNewKey(result.data.key.plainKey);
      setCreateKeyDialogOpen(false);
      setKeyDescription("");
      setExpiryType("preset");
      setExpiryPreset(30);
      setCustomExpiryDate("");
      onSnackbar("访问密钥创建成功");
    } catch (err) {
      onSnackbar(`创建失败: ${(err as Error).message}`);
    }
  };

  const handleDeleteKey = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: "确定要删除这个访问密钥吗？使用此密钥的请求将无法访问。",
      onConfirm: async () => {
        try {
          await deleteKey.mutateAsync({ id, groupId });
          onSnackbar("密钥删除成功");
        } catch (err) {
          onSnackbar(`删除失败: ${(err as Error).message}`);
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    onSnackbar("已复制到剪贴板");
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const handleToggleKeyStatus = async (key: any) => {
    try {
      await updateKey.mutateAsync({
        id: key.id,
        groupId,
        isActive: !key.isActive,
      });
      onSnackbar(key.isActive ? "密钥已禁用" : "密钥已启用");
    } catch (err) {
      onSnackbar(`操作失败: ${(err as Error).message}`);
    }
  };

  const handleEditKey = (key: any) => {
    setEditingKey(key);
    setKeyDescription(key.description || "");

    if (key.expiresAt) {
      const expiresAt = new Date(key.expiresAt);
      const now = new Date();
      if (expiresAt > now) {
        setExpiryType("extend");
        setExtendDays(30);
        setCustomExpiryDate(expiresAt.toISOString().slice(0, 16));
      } else {
        setExpiryType("custom");
        setCustomExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
      }
    } else {
      setExpiryType("preset");
      setExpiryPreset(30);
    }

    setEditKeyDialogOpen(true);
  };

  const handleSaveEditKey = async () => {
    if (!editingKey) return;

    try {
      let expiresAt: string | undefined;

      if (expiryType === "preset") {
        const date = new Date();
        date.setDate(date.getDate() + expiryPreset);
        expiresAt = date.toISOString();
      } else if (expiryType === "extend") {
        const currentExpiry = editingKey.expiresAt ? new Date(editingKey.expiresAt) : new Date();
        currentExpiry.setDate(currentExpiry.getDate() + extendDays);
        expiresAt = currentExpiry.toISOString();
      } else if (expiryType === "custom" && customExpiryDate) {
        expiresAt = new Date(customExpiryDate).toISOString();
      } else if (expiryType === "never") {
        expiresAt = undefined;
      }

      await updateKey.mutateAsync({
        id: editingKey.id,
        groupId,
        description: keyDescription || undefined,
        expiresAt,
      });

      setEditKeyDialogOpen(false);
      setEditingKey(null);
      onSnackbar("密钥信息已更新");
    } catch (err) {
      onSnackbar(`更新失败: ${(err as Error).message}`);
    }
  };

  const keys = (data as any)?.data?.keys || [];

  const displayKey = (key: any, visible: boolean) => {
    if (visible && key.plainKey) {
      return key.plainKey;
    }
    return maskKey(key.keyValue || "ep-****************");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      {/* 顶部工具栏 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            访问密钥
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateKeyDialogOpen(true)}
          >
            创建密钥
          </Button>
        </Box>
      </Box>

      {/* 密钥列表 */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {newKey && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            onClose={() => setNewKey(null)}
            action={
              <IconButton size="small" onClick={() => handleCopyKey(newKey)}>
                <CopyIcon />
              </IconButton>
            }
          >
            <Typography variant="body2" gutterBottom>
              <strong>密钥已生成，请立即保存！此密钥仅显示一次。</strong>
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                bgcolor: "background.paper",
                p: 1,
                borderRadius: 1,
                wordBreak: "break-all",
              }}
            >
              {newKey}
            </Typography>
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : keys.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "grey.100"),
                mx: "auto",
                mb: 2,
              }}
            >
              <KeyIcon sx={{ fontSize: 32, color: "text.disabled" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              还没有访问密钥
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateKeyDialogOpen(true)}>
              创建第一个密钥
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>密钥</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell>到期时间</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>使用次数</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {keys.map((key: any) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {displayKey(key, visibleKeys.has(key.id))}
                        </Typography>
                        <Tooltip title={visibleKeys.has(key.id) ? "隐藏" : "显示"}>
                          <IconButton size="small" onClick={() => toggleKeyVisibility(key.id)}>
                            {visibleKeys.has(key.id) ? (
                              <VisibilityOffIcon fontSize="small" />
                            ) : (
                              <VisibilityIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="复制">
                          <IconButton size="small" onClick={() => handleCopyKey(key.plainKey || maskKey(key.keyValue))}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {key.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : "永久"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          key.isActive && (!key.expiresAt || new Date(key.expiresAt) > new Date())
                            ? "可用"
                            : !key.isActive
                              ? "已禁用"
                              : "已过期"
                        }
                        color={
                          key.isActive && (!key.expiresAt || new Date(key.expiresAt) > new Date()) ? "success" : "default"
                        }
                        size="small"
                        sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                      />
                    </TableCell>
                    <TableCell>{key.usageCount}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                        <Tooltip title={key.isActive ? "禁用" : "启用"}>
                          <IconButton size="small" onClick={() => handleToggleKeyStatus(key)}>
                            {key.isActive ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => handleEditKey(key)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteKey(key.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 创建密钥对话框 */}
      <Dialog open={createKeyDialogOpen} onClose={() => setCreateKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建访问密钥</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="备注（可选）"
            fullWidth
            placeholder="例如：客户A、测试用户等"
            value={keyDescription}
            onChange={(e) => setKeyDescription(e.target.value)}
            helperText="用于标识此密钥的用途或分发对象"
          />
          <TextField
            select
            margin="dense"
            label="到期时间"
            fullWidth
            value={expiryType}
            onChange={(e) => setExpiryType(e.target.value as any)}
          >
            <MenuItem value="preset">快捷选择</MenuItem>
            <MenuItem value="custom">自定义日期</MenuItem>
            <MenuItem value="never">永久有效</MenuItem>
          </TextField>

          {expiryType === "preset" && (
            <TextField
              select
              margin="dense"
              label="有效期"
              fullWidth
              value={expiryPreset}
              onChange={(e) => setExpiryPreset(Number(e.target.value))}
            >
              {EXPIRY_PRESETS.filter((p) => p.days !== null).map((preset) => (
                <MenuItem key={preset.days} value={preset.days}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {expiryType === "custom" && (
            <TextField
              margin="dense"
              label="到期日期时间"
              type="datetime-local"
              fullWidth
              value={customExpiryDate}
              onChange={(e) => setCustomExpiryDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateKeyDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateKey} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑密钥对话框 */}
      <Dialog open={editKeyDialogOpen} onClose={() => setEditKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑密钥</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="备注（可选）"
            fullWidth
            placeholder="例如：客户A、测试用户等"
            value={keyDescription}
            onChange={(e) => setKeyDescription(e.target.value)}
            helperText="用于标识此密钥的用途或分发对象"
          />
          <TextField
            select
            margin="dense"
            label="到期时间"
            fullWidth
            value={expiryType}
            onChange={(e) => setExpiryType(e.target.value as any)}
          >
            <MenuItem value="preset">快捷选择（从今天起）</MenuItem>
            <MenuItem value="extend" disabled={!editingKey?.expiresAt || new Date(editingKey.expiresAt) <= new Date()}>
              延期（基于当前到期时间）
            </MenuItem>
            <MenuItem value="custom">自定义日期</MenuItem>
            <MenuItem value="never">永久有效</MenuItem>
          </TextField>

          {expiryType === "preset" && (
            <TextField
              select
              margin="dense"
              label="有效期"
              fullWidth
              value={expiryPreset}
              onChange={(e) => setExpiryPreset(Number(e.target.value))}
            >
              {EXPIRY_PRESETS.filter((p) => p.days !== null).map((preset) => (
                <MenuItem key={preset.days} value={preset.days}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {expiryType === "extend" && (
            <TextField
              select
              margin="dense"
              label="延长时间"
              fullWidth
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              helperText={`当前到期时间：${editingKey?.expiresAt ? new Date(editingKey.expiresAt).toLocaleString() : "未知"}`}
            >
              {EXTEND_PRESETS.map((preset) => (
                <MenuItem key={preset.days} value={preset.days}>
                  {preset.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {expiryType === "custom" && (
            <TextField
              margin="dense"
              label="到期日期时间"
              type="datetime-local"
              fullWidth
              value={customExpiryDate}
              onChange={(e) => setCustomExpiryDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}

          {expiryType === "never" && (
            <Alert severity="info" sx={{ mt: 1 }}>
              密钥将永久有效，直到手动禁用或删除
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditKeyDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveEditKey} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>取消</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color="error">
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
