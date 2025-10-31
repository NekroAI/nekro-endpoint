import { Box, Container, Grid, Paper, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { Storefront, Dashboard, Api, WebAsset, Business, School } from "@mui/icons-material";

const useCases = [
  {
    icon: <Dashboard sx={{ fontSize: 40 }} />,
    title: "管理后台",
    description: "构建现代化的管理系统，支持权限控制、数据管理和实时监控",
    features: ["用户权限管理", "数据可视化", "实时监控", "审计日志"],
  },
  {
    icon: <Storefront sx={{ fontSize: 40 }} />,
    title: "电商平台",
    description: "快速搭建电商网站，包含商品管理、订单处理和支付集成",
    features: ["商品展示", "购物车", "订单管理", "支付集成"],
  },
  {
    icon: <Api sx={{ fontSize: 40 }} />,
    title: "API 服务",
    description: "构建高性能的 RESTful API，支持自动文档生成和类型验证",
    features: ["RESTful API", "自动文档", "数据验证", "速率限制"],
  },
  {
    icon: <WebAsset sx={{ fontSize: 40 }} />,
    title: "企业官网",
    description: "创建现代化的企业展示网站，支持 SEO 优化和内容管理",
    features: ["SEO 优化", "内容管理", "响应式设计", "性能优化"],
  },
  {
    icon: <Business sx={{ fontSize: 40 }} />,
    title: "SaaS 产品",
    description: "开发多租户 SaaS 应用，包含用户订阅和计费系统",
    features: ["多租户", "订阅计费", "用户管理", "数据隔离"],
  },
  {
    icon: <School sx={{ fontSize: 40 }} />,
    title: "在线教育",
    description: "构建在线学习平台，支持课程管理和进度跟踪",
    features: ["课程管理", "学习进度", "在线测试", "证书颁发"],
  },
];

export const UseCaseSection = () => {
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
            适用场景
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 8, maxWidth: "600px", mx: "auto" }}
          >
            无论是什么类型的应用，都能快速上手
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {useCases.map((useCase, index) => (
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
                      mb: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {useCase.icon}
                    <Typography variant="h5" component="h3" fontWeight="bold">
                      {useCase.title}
                    </Typography>
                  </Box>

                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {useCase.description}
                  </Typography>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {useCase.features.map((feature, featureIndex) => (
                      <Box
                        key={featureIndex}
                        sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: "16px",
                          backgroundColor: `${theme.palette.primary.main}15`,
                          border: `1px solid ${theme.palette.primary.main}30`,
                        }}
                      >
                        <Typography variant="caption" color="primary">
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ amount: 0.3 }}
        >
          <Box sx={{ mt: 8, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: "800px", mx: "auto" }}>
              得益于 Cloudflare 的全球网络和现代化的技术栈， 无论您要构建什么类型的应用，都能获得出色的性能和开发体验。
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};
