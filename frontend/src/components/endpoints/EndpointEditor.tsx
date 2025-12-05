import React from "react";
import { Box } from "@mui/material";
import { StaticEndpointEditor } from "./StaticEndpointEditor";
import { ProxyEndpointEditor } from "./ProxyEndpointEditor";
import { DynamicProxyEndpointEditor } from "./DynamicProxyEndpointEditor";
import { ScriptEndpointEditor } from "./ScriptEndpointEditor";

interface EndpointEditorProps {
  endpoint: {
    id: string;
    name: string;
    path: string;
    type: "static" | "proxy" | "dynamicProxy" | "script";
    config: any;
    accessControl: "public" | "authenticated";
    isPublished: boolean;
    children?: any[];
  };
  onSave: (id: string, updates: any) => Promise<void>;
}

export function EndpointEditor({ endpoint, onSave }: EndpointEditorProps) {
  switch (endpoint.type) {
    case "static":
      return <StaticEndpointEditor endpoint={endpoint} onSave={onSave} />;
    case "proxy":
      return <ProxyEndpointEditor endpoint={endpoint} onSave={onSave} />;
    case "dynamicProxy":
      return (
        <DynamicProxyEndpointEditor
          endpoint={endpoint}
          onSave={(config) => onSave(endpoint.id, { config })}
        />
      );
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
