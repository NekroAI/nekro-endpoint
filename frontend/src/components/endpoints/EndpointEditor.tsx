import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { StaticEndpointEditor } from "./StaticEndpointEditor";
import { ProxyEndpointEditor } from "./ProxyEndpointEditor";
import { ScriptEndpointEditor } from "./ScriptEndpointEditor";

interface EndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    type: "static" | "proxy" | "script";
    config: any;
    accessControl: "public" | "authenticated";
    isPublished: boolean;
  };
  onSave: (id: string, updates: any) => Promise<void>;
}

export function EndpointEditor({ endpoint, onSave }: EndpointEditorProps) {
  switch (endpoint.type) {
    case "static":
      return <StaticEndpointEditor endpoint={endpoint} onSave={onSave} />;
    case "proxy":
      return <ProxyEndpointEditor endpoint={endpoint} onSave={onSave} />;
    case "script":
      return <ScriptEndpointEditor endpoint={endpoint} onSave={onSave} />;
    default:
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <p>不支持的端点类型</p>
        </Box>
      );
  }
}
