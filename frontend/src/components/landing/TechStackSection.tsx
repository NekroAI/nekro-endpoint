import { Box, Container, Grid, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { TechCard } from "./TechCard";
import { ReactLogo, DrizzleLogo, CloudflareLogo, MuiLogo } from "@frontend/assets/logos";

const techStacks = [
  {
    name: "Hono",
    description: "后端框架，以其轻量、快速和对边缘计算的良好支持而著称，是构建高性能 API 的理想选择。",
    icon: (
      <img
        src="https://hono.dev/images/logo.svg"
        alt="Hono logo"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    ),
    color: "#E65100",
  },
  {
    name: "React",
    description: "前端库，通过组件化和虚拟 DOM 技术，实现了高效且声明式的 UI 开发。",
    icon: <ReactLogo width={48} height={48} />,
    color: "#61DAFB",
  },
  {
    name: "Vite",
    description: "前端构建工具，提供极速的冷启动和热模块替换（HMR），显著提升了开发体验。",
    icon: (
      <img
        src="https://vitejs.dev/logo.svg"
        alt="Vite logo"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    ),
    color: "#646CFF",
  },
  {
    name: "Drizzle ORM",
    description: "TypeScript ORM，提供完全类型安全的方式来与数据库交互，告别 SQL 注入和拼写错误。",
    icon: <DrizzleLogo width={48} height={48} />,
    color: "#C5F74F",
  },
  {
    name: "Cloudflare",
    description: "全球网络平台，本项目使用其 Pages, Workers 和 D1 数据库，实现全栈应用的部署和运行。",
    icon: <CloudflareLogo width={48} height={48} />,
    color: "#F38020",
  },
  {
    name: "Zod",
    description: "数据校验库，通过简洁的 Schema 定义，轻松实现从客户端到数据库的端到端类型安全。",
    icon: (
      <img
        src="https://raw.githubusercontent.com/colinhacks/zod/master/logo.svg"
        alt="Zod logo"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    ),
    color: "#3068B7",
  },
  {
    name: "Material-UI",
    description: "流行的 React UI 框架，提供了丰富、可定制的组件，帮助快速构建美观的界面。",
    icon: <MuiLogo width={48} height={48} />,
    color: "#007FFF",
  },
  {
    name: "UnoCSS",
    description: "原子化 CSS 引擎，按需生成样式，保持了 CSS 的灵活性，同时提供了工具类的便利。",
    icon: (
      <img
        src="https://unocss.dev/logo.svg"
        alt="UnoCSS logo"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    ),
    color: "#8A2BE2",
  },
  {
    name: "TypeScript",
    description: "JavaScript 的超集，为项目提供了强大的静态类型系统，增强了代码的可维护性和健壮性。",
    icon: (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg"
        alt="TypeScript logo"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    ),
    color: "#3178C6",
  },
];

export const TechStackSection = () => {
  return (
    <Box
      sx={(theme) => ({
        background: theme.pageBackground,
        py: 8,
      })}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={(theme) => ({
              textAlign: "center",
              fontWeight: "bold",
              background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            })}
          >
            核心技术栈
          </Typography>
          <Typography
            variant="h6"
            sx={(theme) => ({
              textAlign: "center",
              color: theme.palette.text.secondary,
              mb: 6,
              maxWidth: "800px",
              mx: "auto",
            })}
          >
            NekroEdge 精心整合了以下业界一流的技术，为您提供卓越的全栈开发体验。
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {techStacks.map((tech, index) => (
            <Grid item xs={12} sm={6} md={4} key={tech.name}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <TechCard name={tech.name} description={tech.description} icon={tech.icon} color={tech.color} />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};
