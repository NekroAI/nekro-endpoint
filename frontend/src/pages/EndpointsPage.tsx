import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Chip,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  FormHelperText,
  Menu,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  CloudUpload as PublishIcon,
  CloudOff as UnpublishIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  SwapHoriz as ProxyIcon,
  ContentCopy as CopyIcon,
  SwapVerticalCircle as SwapIcon,
  Link as LinkIcon,
  VpnKey as KeyIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AccountTree as DynamicProxyIcon,
} from "@mui/icons-material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import {
  useEndpoints,
  useEndpoint,
  useCreateEndpoint,
  useUpdateEndpoint,
  useDeleteEndpoint,
  usePublishEndpoint,
  useUnpublishEndpoint,
} from "../hooks/useEndpoints";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import { useAccessKeys } from "../hooks/useAccessKeys";
import { useAuth } from "../hooks/useAuth";
import { EndpointEditor } from "../components/endpoints/EndpointEditor";

interface PathTreeNode {
  id: string;
  path: string;
  name: string;
  isVirtual: boolean;
  endpoint?: {
    id: string;
    name: string;
    path: string;
    type: "static" | "proxy" | "dynamicProxy" | "script";
    config: any;
    accessControl: "public" | "authenticated";
    isPublished: boolean;
    enabled: boolean;
  };
  children: PathTreeNode[];
}

export function EndpointsPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useEndpoints("tree") as any;
  const { data: permissionGroupsData } = usePermissionGroups();
  const createEndpoint = useCreateEndpoint();
  const updateEndpoint = useUpdateEndpoint();
  const deleteEndpoint = useDeleteEndpoint();
  const publishEndpoint = usePublishEndpoint();
  const unpublishEndpoint = useUnpublishEndpoint();

  const [selectedNode, setSelectedNode] = useState<PathTreeNode | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showPathInTree, setShowPathInTree] = useState(true); // 默认显示路径

  // 懒加载：只在选中端点时才请求详细配置
  const { data: endpointDetail, isLoading: isLoadingDetail } = useEndpoint(selectedEndpointId);

  // 权限组列表
  const permissionGroups = (permissionGroupsData as any)?.data?.groups || [];
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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

  // 创建端点表单状态
  const [newEndpointName, setNewEndpointName] = useState("");
  const [newEndpointPath, setNewEndpointPath] = useState("");
  const [newEndpointType, setNewEndpointType] = useState<"static" | "proxy" | "dynamicProxy" | "script">("static");
  const [newEndpointAccessControl, setNewEndpointAccessControl] = useState<"public" | "authenticated">("public");
  const [newEndpointPermissionGroups, setNewEndpointPermissionGroups] = useState<string[]>([]);

  // 编辑端点表单状态
  const [editEndpointName, setEditEndpointName] = useState("");
  const [editEndpointPath, setEditEndpointPath] = useState("");
  const [editEndpointAccessControl, setEditEndpointAccessControl] = useState<"public" | "authenticated">("public");
  const [editEndpointPermissionGroups, setEditEndpointPermissionGroups] = useState<string[]>([]);

  // 复制菜单和访问密钥选择
  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null);
  const [accessKeyDialogOpen, setAccessKeyDialogOpen] = useState(false);

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">请先登录</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
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

  const tree: PathTreeNode[] = (data as any)?.data?.tree || [];

  const handleCreateEndpoint = async () => {
    if (!newEndpointName.trim() || !newEndpointPath.trim()) {
      setSnackbar({ open: true, message: "请填写端点名称和路径", severity: "error" });
      return;
    }

    try {
      // 根据端点类型生成符合 Schema 的默认配置
      const defaultConfig =
        newEndpointType === "static"
          ? {
              content: "",
              contentType: "text/plain",
              headers: {},
            }
          : newEndpointType === "proxy"
            ? {
                targetUrl: "https://example.com/api/data",
                headers: {},
                removeHeaders: [],
                timeout: 10000,
              }
            : newEndpointType === "dynamicProxy"
              ? {
                  baseUrl: "",
                  autoAppendSlash: true,
                  headers: {},
                  removeHeaders: [],
                  timeout: 15000,
                  allowedPaths: [],
                }
              : {
                  code: "// 编写脚本\nexport default async function handler(request) {\n  return new Response('Hello World');\n}",
                  runtime: "javascript" as const,
                };

      await createEndpoint.mutateAsync({
        name: newEndpointName,
        path: newEndpointPath.startsWith("/") ? newEndpointPath : `/${newEndpointPath}`,
        type: newEndpointType,
        config: defaultConfig,
        accessControl: newEndpointAccessControl,
        requiredPermissionGroups: newEndpointAccessControl === "authenticated" ? newEndpointPermissionGroups : [],
      });

      setCreateDialogOpen(false);
      setNewEndpointName("");
      setNewEndpointPath("");
      setNewEndpointType("static");
      setNewEndpointAccessControl("public");
      setNewEndpointPermissionGroups([]);
      setSnackbar({ open: true, message: "端点创建成功", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `创建失败: ${(err as Error).message}`, severity: "error" });
    }
  };

  const handleSaveEndpoint = async (id: string, updates: any) => {
    try {
      await updateEndpoint.mutateAsync({ id, ...updates } as any);
      setSnackbar({ open: true, message: "保存成功", severity: "success" });
      // 不重新加载整棵树，只刷新当前端点详情会自动更新
    } catch (err) {
      setSnackbar({ open: true, message: `保存失败: ${(err as Error).message}`, severity: "error" });
    }
  };

  const handleSelectNode = (node: PathTreeNode) => {
    if (node.isVirtual) return; // 虚拟节点不可选中
    setSelectedNode(node);
    setSelectedEndpointId(node.endpoint?.id || null);
  };

  const handleEditEndpoint = () => {
    if (!selectedNode || selectedNode.isVirtual || !selectedNode.endpoint || !selectedEndpoint) return;

    setEditEndpointName(selectedNode.endpoint.name);
    setEditEndpointPath(selectedNode.endpoint.path);
    setEditEndpointAccessControl(selectedEndpoint.accessControl);
    setEditEndpointPermissionGroups((selectedEndpoint as any).requiredPermissionGroups || []);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedNode || selectedNode.isVirtual || !selectedNode.endpoint) return;

    try {
      await updateEndpoint.mutateAsync({
        id: selectedNode.endpoint.id,
        name: editEndpointName,
        path: editEndpointPath.startsWith("/") ? editEndpointPath : `/${editEndpointPath}`,
        accessControl: editEndpointAccessControl,
        requiredPermissionGroups: editEndpointAccessControl === "authenticated" ? editEndpointPermissionGroups : [],
      } as any);
      setEditDialogOpen(false);
      setSnackbar({ open: true, message: "端点信息更新成功", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `更新失败: ${(err as Error).message}`, severity: "error" });
    }
  };

  const handleDeleteEndpoint = () => {
    if (!selectedNode || selectedNode.isVirtual || !selectedNode.endpoint) return;

    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: `确定要删除端点 "${selectedNode.endpoint.name}" 吗？此操作不可撤销。`,
      onConfirm: async () => {
        try {
          await deleteEndpoint.mutateAsync(selectedNode.endpoint!.id);
          setSelectedNode(null);
          setSnackbar({ open: true, message: "端点删除成功", severity: "success" });
        } catch (err) {
          setSnackbar({ open: true, message: `删除失败: ${(err as Error).message}`, severity: "error" });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleTogglePublish = async () => {
    if (!selectedNode || selectedNode.isVirtual || !selectedNode.endpoint) return;

    const endpoint = selectedNode.endpoint;
    try {
      if (endpoint.isPublished) {
        await unpublishEndpoint.mutateAsync(endpoint.id);
        setSnackbar({ open: true, message: "已取消发布", severity: "success" });
      } else {
        await publishEndpoint.mutateAsync(endpoint.id);
        setSnackbar({ open: true, message: "发布成功", severity: "success" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: `操作失败: ${(err as Error).message}`, severity: "error" });
    }
  };

  // 获取端点类型图标
  const getEndpointTypeIcon = (type: string) => {
    switch (type) {
      case "static":
        return <FileIcon sx={{ fontSize: "1.2rem", color: "primary.main" }} />;
      case "proxy":
        return <ProxyIcon sx={{ fontSize: "1.2rem", color: "info.main" }} />;
      case "dynamicProxy":
        return <DynamicProxyIcon sx={{ fontSize: "1.2rem", color: "success.main" }} />;
      case "script":
        return <CodeIcon sx={{ fontSize: "1.2rem", color: "secondary.main" }} />;
      default:
        return <FileIcon sx={{ fontSize: "1.2rem", color: "primary.main" }} />;
    }
  };

  // 复制端点地址
  const handleCopyEndpointUrl = async (endpointPath: string) => {
    const username = user?.username || "";
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/e/${username}${endpointPath}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setSnackbar({ open: true, message: "端点地址已复制到剪贴板", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "复制失败", severity: "error" });
    }
  };

  // 处理复制按钮点击（显示菜单）
  const handleCopyButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    if (selectedEndpoint?.accessControl === "authenticated") {
      setCopyMenuAnchor(event.currentTarget);
    } else {
      handleCopyEndpointUrl(selectedEndpoint?.path || "");
    }
  };

  // 处理复制菜单选择
  const handleCopyMenuSelect = (type: "plain" | "withAuth") => {
    setCopyMenuAnchor(null);
    if (type === "plain") {
      handleCopyEndpointUrl(selectedEndpoint?.path || "");
    } else {
      setAccessKeyDialogOpen(true);
    }
  };

  // 获取节点的显示文本（只显示当前节点部分，不显示完整路径）
  const getDisplayText = (node: PathTreeNode) => {
    if (!showPathInTree) {
      return node.name;
    }

    // 显示路径时，只显示当前节点的名称部分
    // 例如：/test/test222 -> test222，/test -> test
    const pathParts = node.path.split("/").filter(Boolean);
    return pathParts[pathParts.length - 1] || node.name;
  };

  const renderTree = (nodes: PathTreeNode[]) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedNode?.id === node.id;
      const isVirtual = node.isVirtual;
      const displayText = getDisplayText(node);
      const endpointType = node.endpoint?.type || "static";

      return (
        <TreeItem
          key={node.id}
          itemId={node.id}
          label={
            <Tooltip
              title={isVirtual ? `目录: ${node.path}` : `${node.endpoint?.name} (${node.path})`}
              placement="right"
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 0.5,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: isSelected && !isVirtual ? "action.selected" : "transparent",
                  "&:hover": {
                    bgcolor: isSelected && !isVirtual ? "action.selected" : "action.hover",
                  },
                  opacity: isVirtual ? 0.7 : 1,
                  cursor: isVirtual ? "default" : "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation(); // 阻止冒泡到 TreeItem
                  handleSelectNode(node);
                }}
              >
                {hasChildren || isVirtual ? (
                  <FolderIcon sx={{ mr: 1, fontSize: "1.2rem", color: "text.secondary" }} />
                ) : (
                  <Box sx={{ mr: 1 }}>{getEndpointTypeIcon(endpointType)}</Box>
                )}
                <Typography
                  sx={{
                    flexGrow: 1,
                    fontSize: "0.875rem",
                    fontWeight: isSelected && !isVirtual ? 500 : 400,
                    color: isVirtual ? "text.secondary" : "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayText}
                </Typography>
                {!isVirtual && node.endpoint && (
                  <Box sx={{ display: "flex", gap: 0.25, alignItems: "center", ml: 0.5 }}>
                    {/* 发布状态 */}
                    {node.endpoint.isPublished && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                        }}
                      />
                    )}
                    {/* 鉴权状态 */}
                    {node.endpoint.accessControl === "authenticated" && (
                      <LockIcon sx={{ fontSize: "0.75rem", color: "warning.main" }} />
                    )}
                  </Box>
                )}
              </Box>
            </Tooltip>
          }
        >
          {hasChildren && node.children && renderTree(node.children)}
        </TreeItem>
      );
    });
  };

  // 使用懒加载的详细数据
  const selectedEndpoint =
    selectedNode && !selectedNode.isVirtual && endpointDetail ? (endpointDetail as any)?.data : null;

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 左侧：树形视图 */}
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
              我的端点
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              <Tooltip title={showPathInTree ? "显示端点名称" : "显示端点路径"}>
                <IconButton size="small" onClick={() => setShowPathInTree(!showPathInTree)} sx={{ mr: 0.5 }}>
                  <SwapIcon />
                </IconButton>
              </Tooltip>
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
          {!user?.isActivated && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
              <Typography variant="caption">未激活账号无法发布端点</Typography>
            </Alert>
          )}
        </Box>

        <Box sx={{ flexGrow: 1, overflow: "auto", px: 1.5, py: 2 }}>
          {tree.length === 0 ? (
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
                <FileIcon sx={{ fontSize: 32, color: "text.disabled" }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                还没有端点
              </Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                创建第一个端点
              </Button>
            </Box>
          ) : (
            <SimpleTreeView
              expandedItems={expandedItems}
              onExpandedItemsChange={(event, itemIds) => setExpandedItems(itemIds)}
              sx={{ flexGrow: 1 }}
            >
              {renderTree(tree)}
            </SimpleTreeView>
          )}
        </Box>
      </Paper>

      {/* 右侧：编辑器 */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedNode && !selectedNode.isVirtual ? (
          isLoadingDetail ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
            </Box>
          ) : selectedEndpoint ? (
            <>
              <Paper
                elevation={0}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {/* 主要信息区 - 单行布局 */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 3,
                    py: 2,
                  }}
                >
                  {/* 左侧：端点类型图标 + 名称路径 */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                    {/* 端点类型图标 */}
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor:
                          selectedEndpoint.type === "static"
                            ? "primary.main"
                            : selectedEndpoint.type === "proxy"
                              ? "info.main"
                              : "secondary.main",
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {selectedEndpoint.type === "static" ? (
                        <FileIcon />
                      ) : selectedEndpoint.type === "proxy" ? (
                        <ProxyIcon />
                      ) : selectedEndpoint.type === "dynamicProxy" ? (
                        <DynamicProxyIcon />
                      ) : (
                        <CodeIcon />
                      )}
                    </Box>

                    {/* 名称和路径 */}
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          lineHeight: 1.2,
                          mb: 0.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedEndpoint.name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            color: "text.secondary",
                          }}
                        >
                          {selectedEndpoint.path}
                        </Typography>
                        {/* 状态标识 - 紧凑型 */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {selectedEndpoint.isPublished ? (
                            <Chip
                              icon={<PublishIcon />}
                              label="已发布"
                              size="small"
                              color="success"
                              variant="filled"
                              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                            />
                          ) : (
                            <Chip
                              label="未发布"
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                            />
                          )}
                          {selectedEndpoint.accessControl === "authenticated" && (
                            <Chip
                              icon={<LockIcon sx={{ fontSize: "0.75rem" }} />}
                              label="需要鉴权"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* 右侧：操作按钮组 */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                    {/* 主要操作 */}
                    {selectedEndpoint.isPublished ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<UnpublishIcon />}
                        onClick={handleTogglePublish}
                      >
                        取消发布
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<PublishIcon />}
                        onClick={handleTogglePublish}
                        disabled={!user?.isActivated}
                      >
                        发布
                      </Button>
                    )}

                    {/* 次要操作 - 图标按钮 */}
                    <Tooltip title="编辑端点信息">
                      <IconButton size="small" onClick={handleEditEndpoint}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {/* 复制按钮 - 根据是否需要鉴权显示不同行为 */}
                    {selectedEndpoint.accessControl === "authenticated" ? (
                      <>
                        <Tooltip title="复制端点地址">
                          <IconButton size="small" onClick={handleCopyButtonClick}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Menu
                          anchorEl={copyMenuAnchor}
                          open={Boolean(copyMenuAnchor)}
                          onClose={() => setCopyMenuAnchor(null)}
                        >
                          <MenuItem onClick={() => handleCopyMenuSelect("plain")}>
                            <ListItemIcon>
                              <LinkIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>仅复制端点地址</ListItemText>
                          </MenuItem>
                          <MenuItem onClick={() => handleCopyMenuSelect("withAuth")}>
                            <ListItemIcon>
                              <KeyIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>复制鉴权访问地址</ListItemText>
                          </MenuItem>
                        </Menu>
                      </>
                    ) : (
                      <Tooltip title="复制端点地址">
                        <IconButton size="small" onClick={() => handleCopyEndpointUrl(selectedEndpoint.path)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* 危险操作 */}
                    <Tooltip title="删除端点">
                      <IconButton size="small" color="error" onClick={handleDeleteEndpoint}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* 权限组信息 - 仅在需要时显示，紧凑布局 */}
                {selectedEndpoint.accessControl === "authenticated" &&
                  (selectedEndpoint as any).requiredPermissionGroups &&
                  (selectedEndpoint as any).requiredPermissionGroups.length > 0 && (
                    <Box
                      sx={{
                        px: 3,
                        pb: 1,
                        pt: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        borderTop: 1,
                        borderColor: "divider",
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.50"),
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        所需权限组：
                      </Typography>
                      {((selectedEndpoint as any).requiredPermissionGroups as string[]).map((groupId) => {
                        const group = permissionGroups.find((g: any) => g.id === groupId);
                        return (
                          <Chip
                            key={groupId}
                            label={group?.name || "未知"}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                          />
                        );
                      })}
                    </Box>
                  )}
              </Paper>
              <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
                <EndpointEditor endpoint={selectedEndpoint} onSave={handleSaveEndpoint} />
              </Box>
            </>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <Alert severity="error">加载端点详情失败</Alert>
            </Box>
          )
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
              <FileIcon sx={{ fontSize: 40, color: "text.disabled" }} />
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5 }}>
                选择一个端点
              </Typography>
              <Typography variant="body2" color="text.disabled">
                从左侧列表中选择端点进行编辑
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 创建端点对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新端点</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="端点名称"
            fullWidth
            value={newEndpointName}
            onChange={(e) => setNewEndpointName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="端点路径"
            fullWidth
            placeholder="/api/example"
            value={newEndpointPath}
            onChange={(e) => setNewEndpointPath(e.target.value)}
            helperText="路径会自动构建成目录树结构，例如 /api/users 会显示为 api/ -> users"
          />
          <TextField
            select
            margin="dense"
            label="端点类型"
            fullWidth
            value={newEndpointType}
            onChange={(e) => setNewEndpointType(e.target.value as "static" | "proxy" | "dynamicProxy" | "script")}
          >
            <MenuItem value="static">静态内容</MenuItem>
            <MenuItem value="proxy">代理转发（固定 URL）</MenuItem>
            <MenuItem value="dynamicProxy">动态代理（子路径转发）</MenuItem>
            <MenuItem value="script">脚本端点 (Phase 3)</MenuItem>
          </TextField>
          <TextField
            select
            margin="dense"
            label="访问控制"
            fullWidth
            value={newEndpointAccessControl}
            onChange={(e) => {
              const newValue = e.target.value as "public" | "authenticated";
              setNewEndpointAccessControl(newValue);
              if (newValue === "public") {
                setNewEndpointPermissionGroups([]);
              }
            }}
          >
            <MenuItem value="public">公开访问</MenuItem>
            <MenuItem value="authenticated">需要鉴权</MenuItem>
          </TextField>

          {/* 权限组选择器 - 仅在需要鉴权时显示 */}
          {newEndpointAccessControl === "authenticated" && (
            <FormControl fullWidth margin="dense">
              <InputLabel>选择权限组</InputLabel>
              <Select
                multiple
                value={newEndpointPermissionGroups}
                onChange={(e) => setNewEndpointPermissionGroups(e.target.value as string[])}
                input={<OutlinedInput label="选择权限组" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => {
                      const group = permissionGroups.find((g: any) => g.id === id);
                      return <Chip key={id} label={group?.name || id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {permissionGroups.length === 0 && (
                  <MenuItem disabled>
                    <em>暂无权限组，请先创建权限组</em>
                  </MenuItem>
                )}
                {permissionGroups.map((group: any) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>选择可以访问此端点的权限组。用户需要持有对应权限组的访问密钥才能访问。</FormHelperText>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateEndpoint} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑端点信息对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑端点信息</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="端点名称"
            fullWidth
            value={editEndpointName}
            onChange={(e) => setEditEndpointName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="端点路径"
            fullWidth
            value={editEndpointPath}
            onChange={(e) => setEditEndpointPath(e.target.value)}
            helperText="修改路径会影响端点在树中的位置"
          />
          <TextField
            select
            margin="dense"
            label="访问控制"
            fullWidth
            value={editEndpointAccessControl}
            onChange={(e) => {
              const newValue = e.target.value as "public" | "authenticated";
              setEditEndpointAccessControl(newValue);
              if (newValue === "public") {
                setEditEndpointPermissionGroups([]);
              }
            }}
          >
            <MenuItem value="public">公开访问</MenuItem>
            <MenuItem value="authenticated">需要鉴权</MenuItem>
          </TextField>

          {/* 权限组选择器 - 仅在需要鉴权时显示 */}
          {editEndpointAccessControl === "authenticated" && (
            <FormControl fullWidth margin="dense">
              <InputLabel>选择权限组</InputLabel>
              <Select
                multiple
                value={editEndpointPermissionGroups}
                onChange={(e) => setEditEndpointPermissionGroups(e.target.value as string[])}
                input={<OutlinedInput label="选择权限组" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => {
                      const group = permissionGroups.find((g: any) => g.id === id);
                      return <Chip key={id} label={group?.name || id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {permissionGroups.length === 0 && (
                  <MenuItem disabled>
                    <em>暂无权限组，请先创建权限组</em>
                  </MenuItem>
                )}
                {permissionGroups.map((group: any) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>选择可以访问此端点的权限组。用户需要持有对应权限组的访问密钥才能访问。</FormHelperText>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveEdit} variant="contained">
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

      {/* Snackbar 提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />

      {/* 访问密钥选择对话框 */}
      {selectedEndpoint && selectedEndpoint.accessControl === "authenticated" && (
        <AccessKeySelectionDialog
          open={accessKeyDialogOpen}
          onClose={() => setAccessKeyDialogOpen(false)}
          endpointPath={selectedEndpoint.path}
          permissionGroupIds={(selectedEndpoint as any).requiredPermissionGroups || []}
          permissionGroups={permissionGroups}
          onCopyUrl={(url) => {
            navigator.clipboard.writeText(url);
            setSnackbar({ open: true, message: "鉴权访问地址已复制到剪贴板", severity: "success" });
            setAccessKeyDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
}

// 访问密钥选择对话框
interface AccessKeySelectionDialogProps {
  open: boolean;
  onClose: () => void;
  endpointPath: string;
  permissionGroupIds: string[];
  permissionGroups: any[];
  onCopyUrl: (url: string) => void;
}

function AccessKeySelectionDialog({
  open,
  onClose,
  endpointPath,
  permissionGroupIds,
  permissionGroups,
  onCopyUrl,
}: AccessKeySelectionDialogProps) {
  const { user } = useAuth();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedKeyValue, setSelectedKeyValue] = useState<string>("");

  // 构建权限组和密钥的映射
  const groupsWithKeys = permissionGroupIds
    .map((groupId) => {
      const group = permissionGroups.find((g) => g.id === groupId);
      return { groupId, group };
    })
    .filter((item) => item.group);

  const handleCopy = () => {
    if (!selectedKeyValue) return;

    const username = user?.username || "";
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/e/${username}${endpointPath}?access_key=${selectedKeyValue}`;
    onCopyUrl(fullUrl);
  };

  const handleKeySelect = (keyId: string, keyValue: string) => {
    setSelectedKeyId(keyId);
    setSelectedKeyValue(keyValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>选择访问密钥</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          选择一个访问密钥以生成包含鉴权信息的端点访问地址
        </Typography>

        <Box sx={{ mt: 2 }}>
          <RadioGroup value={selectedKeyId}>
            {groupsWithKeys.map(({ groupId, group }) => (
              <AccessKeyGroupSection
                key={groupId}
                groupId={groupId}
                group={group}
                selectedKeyId={selectedKeyId}
                onKeySelect={handleKeySelect}
              />
            ))}
          </RadioGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleCopy} variant="contained" disabled={!selectedKeyValue} startIcon={<CopyIcon />}>
          复制地址
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 权限组密钥区域组件
function AccessKeyGroupSection({
  groupId,
  group,
  selectedKeyId,
  onKeySelect,
}: {
  groupId: string;
  group: any;
  selectedKeyId: string | null;
  onKeySelect: (keyId: string, keyValue: string) => void;
}) {
  const { data: keysData } = useAccessKeys(groupId);
  const keys = (keysData as any)?.data?.keys || [];

  // 只显示可用的密钥
  const activeKeys = keys.filter(
    (key: any) => key.isActive && (!key.expiresAt || new Date(key.expiresAt) > new Date()),
  );

  if (activeKeys.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <KeyIcon fontSize="small" color="primary" />
        {group.name}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" width={50}></TableCell>
              <TableCell>密钥</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>到期时间</TableCell>
              <TableCell>使用次数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeKeys.map((key: any) => (
              <TableRow
                key={key.id}
                hover
                selected={selectedKeyId === key.id}
                onClick={() => onKeySelect(key.id, key.keyValue)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell padding="checkbox">
                  <Radio checked={selectedKeyId === key.id} value={key.id} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {key.keyValue.substring(0, 8)}...{key.keyValue.substring(key.keyValue.length - 6)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {key.description || "-"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "永久"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{key.usageCount}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
