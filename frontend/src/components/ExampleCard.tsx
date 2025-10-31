import { Card, CardContent, Typography, Box, useTheme } from "@mui/material";
import { ReactNode } from "react";

interface ExampleCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  onClick?: () => void;
}

/**
 * 示例卡片组件 - 展示如何创建可复用的组件
 *
 * 使用示例:
 * <ExampleCard
 *   title="标题"
 *   description="描述"
 *   icon={<YourIcon />}
 *   onClick={() => console.log('clicked')}
 * />
 */
export const ExampleCard = ({ title, description, icon, onClick }: ExampleCardProps) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        backgroundColor: theme.glass.background,
        backdropFilter: "blur(16px)",
        border: `1px solid ${theme.palette.divider}`,
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          transform: onClick ? "translateY(-4px)" : "none",
          boxShadow: onClick ? `0 8px 24px ${theme.palette.primary.main}20` : "none",
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3, textAlign: "center" }}>
        {icon && <Box sx={{ color: "primary.main", mb: 2 }}>{icon}</Box>}
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};
