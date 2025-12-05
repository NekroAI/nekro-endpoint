import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Alert,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";
import type { DynamicProxyConfig } from "../../../../common/types";
import { useAuth } from "../../hooks/useAuth";

interface DynamicProxyEndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    config: any;
    children?: any[];
  };
  onSave: (config: DynamicProxyConfig) => void;
  isLoading?: boolean;
}

export function DynamicProxyEndpointEditor({ endpoint, onSave, isLoading }: DynamicProxyEndpointEditorProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<DynamicProxyConfig>(() => {
    const currentConfig = endpoint.config || {};
    return {
      baseUrl: currentConfig.baseUrl || "",
      autoAppendSlash: currentConfig.autoAppendSlash !== undefined ? currentConfig.autoAppendSlash : true,
      headers: currentConfig.headers || {},
      removeHeaders: currentConfig.removeHeaders || [],
      timeout: currentConfig.timeout || 15000,
      allowedPaths: currentConfig.allowedPaths || [],
    };
  });

  const [previewPath, setPreviewPath] = useState("index.html");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    Object.entries(config.headers || {}).map(([key, value]) => ({ key, value })),
  );
  const [removeHeaders, setRemoveHeaders] = useState<string[]>(config.removeHeaders || []);
  const [allowedPaths, setAllowedPaths] = useState<string[]>(config.allowedPaths || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const hasChildren = endpoint.children && endpoint.children.length > 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  useEffect(() => {
    const currentConfig = endpoint.config || {};
    const newConfig = {
      baseUrl: currentConfig.baseUrl || "",
      autoAppendSlash: currentConfig.autoAppendSlash !== undefined ? currentConfig.autoAppendSlash : true,
      headers: currentConfig.headers || {},
      removeHeaders: currentConfig.removeHeaders || [],
      timeout: currentConfig.timeout || 15000,
      allowedPaths: currentConfig.allowedPaths || [],
    };
    setConfig(newConfig);
    setHeaders(Object.entries(newConfig.headers || {}).map(([key, value]) => ({ key, value: String(value) })));
    setRemoveHeaders(newConfig.removeHeaders || []);
    setAllowedPaths(newConfig.allowedPaths || []);
    setHasChanges(false);
  }, [endpoint.id]);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
    setHasChanges(true);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
    setHasChanges(true);
  };

  const addRemoveHeader = () => {
    setRemoveHeaders([...removeHeaders, ""]);
    setHasChanges(true);
  };

  const deleteRemoveHeader = (index: number) => {
    setRemoveHeaders(removeHeaders.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateRemoveHeader = (index: number, value: string) => {
    const updated = [...removeHeaders];
    updated[index] = value;
    setRemoveHeaders(updated);
    setHasChanges(true);
  };

  const addAllowedPath = () => {
    setAllowedPaths([...allowedPaths, ""]);
    setHasChanges(true);
  };

  const deleteAllowedPath = (index: number) => {
    setAllowedPaths(allowedPaths.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateAllowedPath = (index: number, value: string) => {
    const updated = [...allowedPaths];
    updated[index] = value;
    setAllowedPaths(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    const headersObj: { [key: string]: string } = {};
    headers.forEach((h) => {
      if (h.key.trim()) headersObj[h.key] = h.value;
    });

    const finalConfig: DynamicProxyConfig = {
      ...config,
      headers: headersObj,
      removeHeaders: removeHeaders.filter((h) => h.trim()),
      allowedPaths: allowedPaths.filter((p) => p.trim()),
    };

    onSave(finalConfig);
    setHasChanges(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      {/* 配置表单区域 - 可滚动 */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 3 }}>
        {/* 子节点警告 */}
        {hasChildren && (
          <Alert severity="error" sx={{ mb: 2 }}>
            动态代理端点不允许有子节点。请先删除 {endpoint.children!.length} 个子端点后再保存为动态代理类型。
          </Alert>
        )}

        {/* 基础配置 */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            代理配置
          </Typography>

          <TextField
            fullWidth
            label="基础 URL"
            value={config.baseUrl}
            onChange={(e) => {
              setConfig({ ...config, baseUrl: e.target.value });
              setHasChanges(true);
            }}
            placeholder="https://raw.githubusercontent.com/user/repo/main/"
            helperText="所有子路径请求将拼接到此 URL 后（可以包含路径）"
            required
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="超时时间 (毫秒)"
                value={config.timeout}
                onChange={(e) => {
                  setConfig({ ...config, timeout: Number(e.target.value) });
                  setHasChanges(true);
                }}
                inputProps={{ min: 1000, max: 30000 }}
                helperText="请求超时时间，范围 1000-30000 毫秒"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoAppendSlash}
                    onChange={(e) => {
                      setConfig({ ...config, autoAppendSlash: e.target.checked });
                      setHasChanges(true);
                    }}
                  />
                }
                label="自动在 URL 末尾补充斜杠"
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                {config.autoAppendSlash ? "开启后会自动添加 /" : "关闭后保持原样"}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* 路径转发预览 */}
        {config.baseUrl && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              路径转发预览
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                label="测试路径"
                value={previewPath}
                onChange={(e) => setPreviewPath(e.target.value)}
                placeholder="index.html"
                sx={{ width: 300 }}
              />
              <Typography variant="body2" color="text.secondary">
                输入任意路径查看转发效果
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.50"),
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
              }}
            >
              {/* 访问地址 */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  访问地址
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    component="code"
                    sx={{
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      wordBreak: "break-all",
                      color: "text.primary",
                    }}
                  >
                    {`${window.location.origin}/e/${user?.username || "username"}${endpoint.path}/${previewPath}`}
                  </Typography>
                  <Tooltip title={copySuccess === "access" ? "已复制！" : "复制访问地址"}>
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleCopy(
                          `${window.location.origin}/e/${user?.username || "username"}${endpoint.path}/${previewPath}`,
                          "access",
                        )
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* 箭头 */}
              <ArrowIcon sx={{ color: "primary.main", flexShrink: 0 }} />

              {/* 转发目标 */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  转发目标
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: 1,
                    borderColor: "primary.main",
                  }}
                >
                  <Typography
                    component="code"
                    sx={{
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      wordBreak: "break-all",
                      color: "primary.main",
                      fontWeight: 500,
                    }}
                  >
                    {(() => {
                      let normalizedBaseUrl = config.baseUrl;
                      if (config.autoAppendSlash && !config.baseUrl.endsWith("/")) {
                        normalizedBaseUrl = config.baseUrl + "/";
                      }
                      let normalizedPath = previewPath.startsWith("/") ? previewPath.slice(1) : previewPath;
                      return normalizedBaseUrl + normalizedPath;
                    })()}
                  </Typography>
                  <Tooltip title={copySuccess === "target" ? "已复制！" : "复制目标地址"}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        let normalizedBaseUrl = config.baseUrl;
                        if (config.autoAppendSlash && !config.baseUrl.endsWith("/")) {
                          normalizedBaseUrl = config.baseUrl + "/";
                        }
                        let normalizedPath = previewPath.startsWith("/") ? previewPath.slice(1) : previewPath;
                        handleCopy(normalizedBaseUrl + normalizedPath, "target");
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* 自定义请求头 */}
        <Paper sx={{ p: 3, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              自定义请求头
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addHeader}>
              添加
            </Button>
          </Box>

          {headers.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Header 名称</TableCell>
                  <TableCell>Header 值</TableCell>
                  <TableCell width={60}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {headers.map((header, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="例如: Authorization"
                        value={header.key}
                        onChange={(e) => updateHeader(index, "key", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Header 值"
                        value={header.value}
                        onChange={(e) => updateHeader(index, "value", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeHeader(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              暂无自定义请求头
            </Typography>
          )}
        </Paper>

        {/* 移除的请求头和路径白名单 - 使用两列布局 */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  移除的请求头
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addRemoveHeader}>
                  添加
                </Button>
              </Box>

              {removeHeaders.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Header 名称</TableCell>
                      <TableCell width={60}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {removeHeaders.map((header, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="例如: User-Agent"
                            value={header}
                            onChange={(e) => updateRemoveHeader(index, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => deleteRemoveHeader(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无移除的请求头
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  路径白名单（可选）
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addAllowedPath}>
                  添加
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                限制可访问的路径，支持通配符 *。留空允许所有路径。
              </Typography>

              {allowedPaths.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>路径模式</TableCell>
                      <TableCell width={60}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allowedPaths.map((path, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="例如: /repos/*"
                            value={path}
                            onChange={(e) => updateAllowedPath(index, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => deleteAllowedPath(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无路径限制（允许所有路径）
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* 底部保存栏 - 固定在底部，常驻 */}
      <Paper
        elevation={3}
        sx={{
          borderTop: 1,
          borderColor: "divider",
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ flexGrow: 1 }} />

        {hasChanges && (
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
            有未保存的更改
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges || isLoading || hasChildren || !config.baseUrl}
          size="small"
        >
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </Paper>
    </Box>
  );
}
