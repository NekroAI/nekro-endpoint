import { Box, Container, Grid, Paper, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { TrendingUp, MonetizationOn, Speed, Security, Public, AutoMode } from "@mui/icons-material";

const advantages = [
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: "自动扩展",
    description: "根据流量自动扩缩容，无需预先配置服务器容量",
    highlight: "0 到百万并发",
  },
  {
    icon: <MonetizationOn sx={{ fontSize: 40 }} />,
    title: "按需付费",
    description: "只为实际使用的资源付费，大幅降低运营成本",
    highlight: "节省高达 80% 成本",
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: "全球加速",
    description: "利用 Cloudflare 全球网络，实现毫秒级响应时间",
    highlight: "< 50ms 延迟",
  },
  {
    icon: <Security sx={{ fontSize: 40 }} />,
    title: "企业级安全",
    description: "内置 DDoS 防护、SSL 加密和安全认证",
    highlight: "零安全漏洞",
  },
  {
    icon: <Public sx={{ fontSize: 40 }} />,
    title: "边缘计算",
    description: "在用户最近的数据中心执行代码，提供最佳性能",
    highlight: "200+ 边缘节点",
  },
  {
    icon: <AutoMode sx={{ fontSize: 40 }} />,
    title: "零运维",
    description: "无需管理服务器、操作系统或运行时环境",
    highlight: "100% 托管服务",
  },
];

export const ServerlessAdvantageSection = () => {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        background: theme.pageBackground,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: "absolute",
          top: "20%",
          left: "-10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.palette.secondary.main}10 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
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
            无服务器架构优势
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 8, maxWidth: "700px", mx: "auto" }}
          >
            拥抱现代化的无服务器架构，专注业务逻辑而非基础设施
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {advantages.map((advantage, index) => (
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
                    position: "relative",
                    overflow: "hidden",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: `0 12px 32px ${theme.palette.primary.main}20`,
                      borderColor: theme.palette.primary.light,
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
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
                    {advantage.icon}
                  </Box>

                  <Typography variant="h6" component="h3" gutterBottom fontWeight="bold" textAlign="center">
                    {advantage.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6, textAlign: "center" }}
                  >
                    {advantage.description}
                  </Typography>

                  <Box
                    sx={{
                      textAlign: "center",
                      p: 2,
                      borderRadius: "12px",
                      backgroundColor: `${theme.palette.primary.main}10`,
                      border: `1px solid ${theme.palette.primary.main}20`,
                    }}
                  >
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">
                      {advantage.highlight}
                    </Typography>
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
          <Box sx={{ mt: 10, textAlign: "center" }}>
            <Paper
              sx={{
                p: 6,
                backgroundColor: theme.glass.background,
                backdropFilter: "blur(16px)",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "16px",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}05, ${theme.palette.secondary.main}05)`,
              }}
            >
              <Typography variant="h5" gutterBottom fontWeight="bold">
                为什么选择无服务器？
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: "800px", mx: "auto", lineHeight: 1.8 }}
              >
                传统服务器架构需要预先配置容量、持续维护和手动扩展。而无服务器架构让您专注于编写代码，
                由平台自动处理扩展、监控和维护。这不仅降低了成本，还大大提升了开发效率和应用可靠性。
              </Typography>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};
