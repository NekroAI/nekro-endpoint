import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface ProxyEndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    config: {
      targetUrl: string;
      pathMapping?: string;
      headers?: { [key: string]: string };
      removeHeaders?: string[];
      timeout?: number;
    };
  };
  onSave: (id: string, updates: any) => Promise<void>;
}

export function ProxyEndpointEditor({ endpoint, onSave }: ProxyEndpointEditorProps) {
  const [targetUrl, setTargetUrl] = useState(endpoint.config.targetUrl || "");
  const [pathMapping, setPathMapping] = useState(endpoint.config.pathMapping || "${path}");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    Object.entries(endpoint.config.headers || {}).map(([key, value]) => ({ key, value })),
  );
  const [timeout, setTimeout] = useState(endpoint.config.timeout || 10000);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTargetUrl(endpoint.config.targetUrl || "");
    setPathMapping(endpoint.config.pathMapping || "${path}");
    setHeaders(Object.entries(endpoint.config.headers || {}).map(([key, value]) => ({ key, value })));
    setTimeout(endpoint.config.timeout || 10000);
    setHasChanges(false);
  }, [endpoint.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headersObj: { [key: string]: string } = {};
      headers.forEach((h) => {
        if (h.key.trim()) headersObj[h.key] = h.value;
      });

      await onSave(endpoint.id, {
        config: {
          targetUrl,
          pathMapping,
          headers: headersObj,
          removeHeaders: [],
          timeout,
        },
      });
      setHasChanges(false);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      {/* 配置表单区域 - 可滚动 */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 3 }}>
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            代理配置
          </Typography>

          <TextField
            fullWidth
            label="目标 URL"
            placeholder="https://example.com"
            value={targetUrl}
            onChange={(e) => {
              setTargetUrl(e.target.value);
              setHasChanges(true);
            }}
            sx={{ mb: 2 }}
            helperText="目标服务器的基础 URL"
          />

          <TextField
            fullWidth
            label="路径映射"
            placeholder="${path}"
            value={pathMapping}
            onChange={(e) => {
              setPathMapping(e.target.value);
              setHasChanges(true);
            }}
            sx={{ mb: 2 }}
            helperText="使用 ${path} 表示原始路径，例如: /api/${path}"
          />

          <TextField
            fullWidth
            type="number"
            label="超时时间 (毫秒)"
            value={timeout}
            onChange={(e) => {
              setTimeout(parseInt(e.target.value) || 10000);
              setHasChanges(true);
            }}
            inputProps={{ min: 1000, max: 30000 }}
            helperText="请求超时时间，范围 1000-30000 毫秒"
          />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              请求头
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
          disabled={!hasChanges || isSaving}
          size="small"
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </Paper>
    </Box>
  );
}
