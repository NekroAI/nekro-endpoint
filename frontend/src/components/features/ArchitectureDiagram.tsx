import { Box, Tooltip, useTheme } from "@mui/material";
import { Computer, Api, Storage, DataObject } from "@mui/icons-material";
import { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DiagramNodeProps {
  x: number;
  y: number;
  icon: ReactElement;
  label: string;
  description: string;
}

const DiagramNode = ({ x, y, icon, label, description }: DiagramNodeProps) => {
  const theme = useTheme();
  return (
    <g transform={`translate(${x}, ${y})`}>
      <Tooltip title={description} placement="top" arrow>
        <foreignObject x="-40" y="-40" width="80" height="80">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: theme.palette.background.paper,
              border: `2px solid ${theme.palette.divider}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              textAlign: "center",
              color: theme.palette.text.primary,
              cursor: "pointer",
            }}
          >
            {icon}
            <Box sx={{ fontSize: "10px", fontWeight: "bold", mt: 0.5 }}>{label}</Box>
          </Box>
        </foreignObject>
      </Tooltip>
    </g>
  );
};

const nodeDescriptions = {
  frontend: "前端界面 (React): 您正在交互的用户界面。当您拨动开关时，它会构建一个类型安全的请求发送给后端。",
  hono: "后端接口 (Hono): 运行在 Cloudflare Workers 上的轻量级后端。它负责接收请求、校验数据，并命令 ORM 操作数据库。",
  drizzle: "ORM (Drizzle): 一个类型安全的 TypeScript ORM。它将后端的业务逻辑翻译成高效、安全的 SQL 查询语句。",
  d1: "数据库 (D1): Cloudflare 的原生无服务器 SQL 数据库。所有功能开关的状态都持久化存储在这里。",
};

export const ArchitectureDiagram = ({ isAnimating }: { isAnimating: boolean }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  return (
    <Box sx={{ my: 4, display: "flex", justifyContent: "center" }}>
      <svg viewBox="0 0 600 200" width="100%" style={{ maxWidth: "800px", overflow: "visible" }}>
        <defs>
          <linearGradient id="request-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.palette.secondary.main} />
            <stop offset="100%" stopColor={theme.palette.primary.main} />
          </linearGradient>
          <linearGradient id="response-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.palette.primary.main} />
            <stop offset="100%" stopColor={theme.palette.secondary.main} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.palette.divider} />
          </marker>
        </defs>

        {/* Animation Paths */}
        <path id="req-path" d="M 80 100 H 520" fill="none" />
        <path id="res-path" d="M 520 100 H 80" fill="none" />

        {/* Connection Lines */}
        <path d="M 80 100 H 520" stroke={theme.palette.divider} strokeWidth="2" markerEnd="url(#arrowhead)" />

        {/* Nodes - Rendered first to be in the background */}
        <DiagramNode
          x={50}
          y={100}
          icon={<Computer sx={{ fontSize: 32 }} />}
          label="Frontend"
          description={nodeDescriptions.frontend}
        />
        <DiagramNode
          x={200}
          y={100}
          icon={<Api sx={{ fontSize: 32 }} />}
          label="Hono API"
          description={nodeDescriptions.hono}
        />
        <DiagramNode
          x={350}
          y={100}
          icon={<DataObject sx={{ fontSize: 32 }} />}
          label="Drizzle ORM"
          description={nodeDescriptions.drizzle}
        />
        <DiagramNode
          x={550}
          y={100}
          icon={<Storage sx={{ fontSize: 32 }} />}
          label="D1 Database"
          description={nodeDescriptions.d1}
        />

        {/* Animated Trails and Packets - Rendered last to be on top */}
        <AnimatePresence>
          {isAnimating && (
            <motion.g key="particle-animation" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
              {/* REQUEST */}
              <motion.path
                d="M 80 100 H 520"
                stroke="url(#request-grad)"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
              <motion.g initial={{ x: 80 }} animate={{ x: 520 }} transition={{ duration: 1.2, ease: "easeInOut" }}>
                <circle r="8" cy="100" fill={theme.palette.primary.main} style={{ filter: "blur(6px)" }} />
                <circle r="5" cy="100" fill="#fff" />
              </motion.g>

              {/* RESPONSE */}
              <motion.path
                d="M 520 100 H 80"
                stroke="url(#response-grad)"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut", delay: 1.2 }}
              />
              <motion.g
                initial={{ x: 520 }}
                animate={{ x: 80 }}
                transition={{ duration: 0.6, ease: "easeInOut", delay: 1.2 }}
              >
                <circle r="8" cy="100" fill={theme.palette.secondary.main} style={{ filter: "blur(6px)" }} />
                <circle r="5" cy="100" fill="#fff" />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </Box>
  );
};
