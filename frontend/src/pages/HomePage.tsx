import { Box, Container, Typography, Button, Grid, Card, CardContent, useTheme, Paper, Chip } from "@mui/material";
import {
  Dashboard as WorkspaceIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  CloudQueue as CloudIcon,
  Router as RouterIcon,
  Description as DocsIcon,
  GitHub as GitHubIcon,
  Storage as EndpointsIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const HomePage = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
          pt: 12,
          pb: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Chip label="边缘端点编排平台" color="primary" sx={{ mb: 3, fontSize: "0.875rem", fontWeight: 600 }} />
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
              }}
            >
              NekroEndpoint
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: "800px", mx: "auto", fontWeight: 400 }}
            >
              在边缘构建你的 API 端点，支持静态内容托管、资源代理等
              <br />
              完全开源！部署即可使用所有功能，立即发布你的端点到全球边缘网络
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
              {isAuthenticated ? (
                <>
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    variant="contained"
                    size="large"
                    startIcon={<WorkspaceIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    进入工作台
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/docs"
                    variant="outlined"
                    size="large"
                    startIcon={<DocsIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    使用文档
                  </Button>
                  <Button
                    component="a"
                    href="https://github.com/NekroAI/nekro-endpoint"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="large"
                    startIcon={<GitHubIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    开源仓库
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={RouterLink}
                    to="/dashboard"
                    variant="contained"
                    size="large"
                    sx={{ px: 4, py: 1.5 }}
                  >
                    立即开始
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/docs"
                    variant="outlined"
                    size="large"
                    startIcon={<DocsIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    使用文档
                  </Button>
                  <Button
                    component="a"
                    href="https://github.com/NekroAI/nekro-endpoint"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="large"
                    startIcon={<GitHubIcon />}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    开源仓库
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography variant="h3" align="center" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
          核心功能
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: "auto" }}>
          基于 Cloudflare Workers 构建的高性能边缘端点平台
        </Typography>

        <Grid container spacing={4}>
          {/* 端点类型 */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: "100%",
                transition: "all 0.3s",
                "&:hover": { transform: "translateY(-8px)", boxShadow: theme.shadows[8] },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${theme.palette.primary.main}15`,
                    mb: 3,
                  }}
                >
                  <EndpointsIcon sx={{ fontSize: 32, color: "primary.main" }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                  多种端点类型
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  支持静态内容、固定代理、动态代理、脚本执行四种端点类型，满足不同场景需求
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip label="Static" size="small" />
                  <Chip label="Proxy" size="small" />
                  <Chip label="Dynamic Proxy" size="small" color="success" />
                  <Chip label="Script" size="small" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 权限控制 */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: "100%",
                transition: "all 0.3s",
                "&:hover": { transform: "translateY(-8px)", boxShadow: theme.shadows[8] },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${theme.palette.success.main}15`,
                    mb: 3,
                  }}
                >
                  <KeyIcon sx={{ fontSize: 32, color: "success.main" }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                  灵活权限控制
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  创建权限组，生成访问密钥，为端点配置细粒度的访问控制，支持二次分发
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip label="权限组" size="small" />
                  <Chip label="访问密钥" size="small" />
                  <Chip label="期限控制" size="small" color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 边缘性能 */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: "100%",
                transition: "all 0.3s",
                "&:hover": { transform: "translateY(-8px)", boxShadow: theme.shadows[8] },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${theme.palette.warning.main}15`,
                    mb: 3,
                  }}
                >
                  <SpeedIcon sx={{ fontSize: 32, color: "warning.main" }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                  全球边缘加速
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  基于 Cloudflare Workers 部署，在全球 300+ 节点提供毫秒级响应速度
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip label="全球部署" size="small" />
                  <Chip label="极低成本" size="small" />
                  <Chip label="极速响应" size="small" color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Use Cases Section */}
      <Box sx={{ bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50", py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
            应用场景
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: "auto" }}>
            为技术用户打造的边缘端点编排工具
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <RouterIcon sx={{ fontSize: 32, color: "primary.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      仓库资源加速 ⭐
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      通过动态代理一键代理整个 GitHub 仓库，加速访问所有文件，无需为每个资源创建端点
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <CodeIcon sx={{ fontSize: 32, color: "success.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      API 代理与转发
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      代理第三方 API，隐藏密钥、添加请求头、实现跨域访问，构建统一的 API 网关
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <SecurityIcon sx={{ fontSize: 32, color: "warning.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      配置文件托管
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      托管 Clash 订阅、规则列表等配置文件，配合访问密钥实现安全分发和版本管理
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <CloudIcon sx={{ fontSize: 32, color: "info.main", mt: 0.5 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      CDN 资源代理
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      代理 CDN 资源目录，加速静态资源访问，支持图片、CSS、JS 等多种文件类型
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            开始构建你的边缘端点
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
            使用 GitHub 账号登录，立即开始创建和管理你的端点
          </Typography>
          <Button component={RouterLink} to="/dashboard" variant="contained" size="large" sx={{ px: 6, py: 2 }}>
            立即开始
          </Button>
        </Container>
      )}
    </Box>
  );
};

export default HomePage;
