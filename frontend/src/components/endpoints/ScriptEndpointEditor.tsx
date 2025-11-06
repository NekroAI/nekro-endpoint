import React from "react";
import { Box, Typography, Alert } from "@mui/material";

interface ScriptEndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    config: any;
  };
  onSave: (id: string, updates: any) => Promise<void>;
}

export function ScriptEndpointEditor({ endpoint, onSave }: ScriptEndpointEditorProps) {
  return (
    <Box
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          脚本端点 (Phase 3)
        </Typography>
        <Typography variant="body2">
          脚本端点功能将在 Phase 3 实现，届时您将能够编写自定义 JavaScript 代码来处理请求。
        </Typography>
      </Alert>
    </Box>
  );
}
