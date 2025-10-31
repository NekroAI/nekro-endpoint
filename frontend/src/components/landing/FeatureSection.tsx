import { Box, Container, Grid, Paper, Typography, useTheme } from "@mui/material";
import { Security, CloudDone, Speed, Code, Api, Storage } from "@mui/icons-material";
import { motion } from "framer-motion";

const features = [
  {
    icon: <Security sx={{ fontSize: 40 }} />,
    title: "端到端类型安全",
    description: "从数据库到前端的完整 TypeScript 类型安全，减少运行时错误",
  },
  {
    icon: <CloudDone sx={{ fontSize: 40 }} />,
    title: "Cloudflare 原生",
    description: "完全基于 Cloudflare 生态，享受边缘计算的性能优势",
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: "极速开发体验",
    description: "热重载、自动重启，现代化的开发工具链",
  },
  {
    icon: <Code sx={{ fontSize: 40 }} />,
    title: "现代化架构",
    description: "使用最新的 Web 技术栈，遵循最佳实践",
  },
  {
    icon: <Api sx={{ fontSize: 40 }} />,
    title: "自动 API 文档",
    description: "集成 OpenAPI，自动生成交互式 API 文档",
  },
  {
    icon: <Storage sx={{ fontSize: 40 }} />,
    title: "无服务器数据库",
    description: "使用 Cloudflare D1，无需管理数据库基础设施",
  },
];

export const FeatureSection = () => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ amount: 0.3 }}
        >
          <Typography
            variant="h3"
            component="h2"
            textAlign="center"
            gutterBottom
            sx={{
              fontWeight: "bold",
              mb: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            核心特性
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 8, maxWidth: "600px", mx: "auto" }}
          >
            为现代 Web 开发而设计的完整解决方案
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ amount: 0.3 }}
              >
                <Paper
                  sx={{
                    p: 4,
                    height: "100%",
                    textAlign: "center",
                    backgroundColor: theme.glass.background,
                    backdropFilter: "blur(16px)",
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "16px",
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: `0 12px 32px ${theme.palette.primary.main}20`,
                      borderColor: theme.palette.primary.light,
                    },
                  }}
                >
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      mb: 2,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                    {feature.description}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};
