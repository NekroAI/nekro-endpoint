import React, { useState, useEffect } from "react";
import { Box, Button, TextField, Paper, Typography, Alert, MenuItem, ListSubheader } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import Editor from "@monaco-editor/react";
import { useAppTheme } from "../../context/ThemeContextProvider";

interface StaticEndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    config: {
      content: string;
      contentType?: string;
      headers?: { [key: string]: string };
    };
  };
  onSave: (id: string, updates: any) => Promise<void>;
}

export function StaticEndpointEditor({ endpoint, onSave }: StaticEndpointEditorProps) {
  const { themeMode } = useAppTheme();
  const [content, setContent] = useState(endpoint.config.content || "");
  const [contentType, setContentType] = useState(endpoint.config.contentType || "text/plain");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(endpoint.config.content || "");
    setContentType(endpoint.config.contentType || "text/plain");
    setHasChanges(false);
  }, [endpoint.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(endpoint.id, {
        config: {
          content,
          contentType,
          headers: {},
        },
      });
      setHasChanges(false);
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (value: string | undefined) => {
    setContent(value || "");
    setHasChanges(true);
  };

  const getLanguage = () => {
    // 精确匹配和包含匹配
    if (contentType === "application/json" || contentType.includes("json")) return "json";
    if (contentType === "text/html" || contentType.includes("html")) return "html";
    if (contentType === "application/xml" || contentType === "text/xml" || contentType.includes("xml")) return "xml";
    if (contentType === "text/css") return "css";
    if (contentType === "application/javascript" || contentType === "text/javascript") return "javascript";
    if (contentType === "application/typescript") return "typescript";
    if (contentType === "text/yaml" || contentType === "application/x-yaml") return "yaml";
    if (contentType === "text/markdown") return "markdown";
    if (contentType === "text/x-python" || contentType === "application/x-python") return "python";
    if (contentType === "text/x-shellscript" || contentType === "application/x-sh") return "shell";
    if (contentType === "application/sql" || contentType === "text/x-sql") return "sql";
    if (contentType === "text/x-ini" || contentType === "application/x-ini") return "ini";
    if (contentType === "application/toml" || contentType === "text/x-toml") return "ini"; // TOML 用 INI 高亮
    if (contentType === "text/x-properties") return "properties";
    if (contentType === "application/x-httpd-php" || contentType === "text/x-php") return "php";
    if (contentType === "text/x-ruby") return "ruby";
    if (contentType === "text/x-go") return "go";
    if (contentType === "text/x-rust") return "rust";
    if (contentType === "text/x-java") return "java";
    if (contentType === "text/x-csharp") return "csharp";
    if (contentType === "text/x-c") return "c";
    if (contentType === "text/x-c++") return "cpp";
    return "plaintext";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      {/* 编辑器区域 - 扩大到最大 */}
      <Box sx={{ flexGrow: 1, overflow: "hidden", position: "relative" }}>
        <Editor
          height="100%"
          language={getLanguage()}
          value={content}
          onChange={handleContentChange}
          theme={themeMode === "dark" ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </Box>

      {/* 底部配置栏 - 固定在底部，常驻 */}
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
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: "fit-content" }}>
          响应配置
        </Typography>
        <TextField
          select
          size="small"
          label="Content-Type"
          value={contentType}
          onChange={(e) => {
            setContentType(e.target.value);
            setHasChanges(true);
          }}
          sx={{ minWidth: 280 }}
        >
          <ListSubheader>通用文本</ListSubheader>
          <MenuItem value="text/plain">text/plain</MenuItem>

          <ListSubheader>Web 相关</ListSubheader>
          <MenuItem value="text/html">text/html</MenuItem>
          <MenuItem value="text/css">text/css</MenuItem>
          <MenuItem value="application/javascript">application/javascript</MenuItem>
          <MenuItem value="application/typescript">application/typescript</MenuItem>

          <ListSubheader>数据格式</ListSubheader>
          <MenuItem value="application/json">application/json</MenuItem>
          <MenuItem value="application/xml">application/xml</MenuItem>
          <MenuItem value="text/yaml">text/yaml (YAML)</MenuItem>
          <MenuItem value="application/toml">application/toml (TOML)</MenuItem>
          <MenuItem value="text/csv">text/csv (CSV)</MenuItem>
          <MenuItem value="text/markdown">text/markdown (Markdown)</MenuItem>

          <ListSubheader>配置文件</ListSubheader>
          <MenuItem value="text/x-ini">text/x-ini (INI)</MenuItem>
          <MenuItem value="text/x-properties">text/x-properties (Properties)</MenuItem>

          <ListSubheader>编程语言</ListSubheader>
          <MenuItem value="text/x-python">text/x-python (Python)</MenuItem>
          <MenuItem value="text/x-shellscript">text/x-shellscript (Shell)</MenuItem>
          <MenuItem value="application/sql">application/sql (SQL)</MenuItem>
          <MenuItem value="application/x-httpd-php">application/x-httpd-php (PHP)</MenuItem>
          <MenuItem value="text/x-ruby">text/x-ruby (Ruby)</MenuItem>
          <MenuItem value="text/x-go">text/x-go (Go)</MenuItem>
          <MenuItem value="text/x-rust">text/x-rust (Rust)</MenuItem>
          <MenuItem value="text/x-java">text/x-java (Java)</MenuItem>
          <MenuItem value="text/x-csharp">text/x-csharp (C#)</MenuItem>
          <MenuItem value="text/x-c">text/x-c (C)</MenuItem>
          <MenuItem value="text/x-c++">text/x-c++ (C++)</MenuItem>
        </TextField>

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
