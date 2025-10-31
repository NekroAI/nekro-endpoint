# 🎨 主题定制指南

本指南详细介绍 NekroEdge 模板的主题系统，包括如何自定义颜色、组件样式和创建自己的设计系统。

## 🏗️ 主题系统架构

NekroEdge 使用 **Material-UI** 作为基础设计系统，结合自定义主题扩展，提供完整的亮/暗模式支持。

### 核心组件

- **ThemeProvider**: 全局主题提供者
- **useAppTheme**: 主题状态管理 Hook
- **自定义主题**: 扩展的 Material-UI 主题
- **类型安全**: TypeScript 主题类型定义

## 📁 主题文件结构

```
frontend/src/theme/
├── index.ts             # 主题定义和导出
├── types.ts             # 主题类型定义
└── components.ts        # 组件主题覆盖
```

## 🎯 快速开始

### 1. 修改基础颜色

```typescript
// frontend/src/theme/index.ts
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2196f3", // 主色调
      light: "#64b5f6", // 浅色变体
      dark: "#1976d2", // 深色变体
    },
    secondary: {
      main: "#f50057", // 次要色调
      light: "#ff5983",
      dark: "#c51162",
    },
    background: {
      default: "#ffffff", // 页面背景
      paper: "#f5f5f5", // 卡片背景
    },
  },
});
```

### 2. 添加自定义颜色

```typescript
// frontend/src/theme/types.ts
declare module "@mui/material/styles" {
  interface Theme {
    pageBackground: string;
    cardShadow: string;
    customColors: {
      success: string;
      warning: string;
      info: string;
    };
  }

  interface ThemeOptions {
    pageBackground?: string;
    cardShadow?: string;
    customColors?: {
      success?: string;
      warning?: string;
      info?: string;
    };
  }
}
```

```typescript
// frontend/src/theme/index.ts
export const lightTheme = createTheme({
  // ... 基础配置
  pageBackground: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  cardShadow: "0 4px 20px rgba(0,0,0,0.1)",
  customColors: {
    success: "#4caf50",
    warning: "#ff9800",
    info: "#2196f3",
  },
});
```

### 3. 在组件中使用

```typescript
// 在任意组件中使用自定义主题
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: theme.pageBackground,
        boxShadow: theme.cardShadow,
        color: theme.customColors.success,
      }}
    >
      我的自定义组件
    </Box>
  );
};
```

## 🌗 亮暗模式配置

### 完整的双主题配置

```typescript
// frontend/src/theme/index.ts
const baseTheme = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    background: {
      default: "#ffffff",
      paper: "#f8f9fa",
    },
    text: {
      primary: "#2c3e50",
      secondary: "#7f8c8d",
    },
  },
  pageBackground: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  cardShadow: "0 2px 10px rgba(0,0,0,0.1)",
});

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "dark",
    primary: { main: "#90caf9" },
    secondary: { main: "#f48fb1" },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b0b0b0",
    },
  },
  pageBackground: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
  cardShadow: "0 2px 10px rgba(0,0,0,0.3)",
});
```

### 主题切换逻辑

```typescript
// frontend/src/context/ThemeContextProvider.tsx
export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};

// 使用示例
const ThemeToggleButton = () => {
  const { isDarkMode, toggleTheme } = useAppTheme();

  return (
    <IconButton onClick={toggleTheme} color="inherit">
      {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};
```

## 🎨 组件样式定制

### 全局组件样式覆盖

```typescript
// frontend/src/theme/components.ts
export const componentOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        borderRadius: 8,
        fontWeight: 600,
        padding: "10px 24px",
      },
      contained: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        "&:hover": {
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "none",
        backdropFilter: "blur(20px)",
        backgroundColor: "rgba(255,255,255,0.8)",
      },
    },
  },
};

// 在主题中应用
export const lightTheme = createTheme({
  // ... 其他配置
  components: componentOverrides,
});
```

### 响应式设计

```typescript
// 自定义断点
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// 响应式样式
const ResponsiveComponent = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        padding: {
          xs: theme.spacing(2),
          md: theme.spacing(4),
          lg: theme.spacing(6),
        },
        fontSize: {
          xs: '14px',
          md: '16px',
          lg: '18px',
        },
      }}
    >
      响应式内容
    </Box>
  );
};
```

## 🎭 高级主题定制

### 创建主题变体

```typescript
// 创建多种主题变体
export const themes = {
  default: lightTheme,
  dark: darkTheme,
  ocean: createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#006064' },
      secondary: { main: '#0097a7' },
      background: {
        default: '#e0f2f1',
        paper: '#f1f8e9',
      },
    },
    pageBackground: 'linear-gradient(135deg, #00bcd4 0%, #009688 100%)',
  }),
  sunset: createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#ff5722' },
      secondary: { main: '#ff9800' },
      background: {
        default: '#fff3e0',
        paper: '#fce4ec',
      },
    },
    pageBackground: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
  }),
};

// 主题选择器
const ThemeSelector = () => {
  const [selectedTheme, setSelectedTheme] = useState('default');

  return (
    <FormControl>
      <Select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
        <MenuItem value="default">默认</MenuItem>
        <MenuItem value="dark">暗黑</MenuItem>
        <MenuItem value="ocean">海洋</MenuItem>
        <MenuItem value="sunset">日落</MenuItem>
      </Select>
    </FormControl>
  );
};
```

### 动态主题生成

```typescript
// 基于用户偏好生成主题
const generatePersonalTheme = (preferences: UserPreferences) => {
  return createTheme({
    palette: {
      mode: preferences.darkMode ? "dark" : "light",
      primary: { main: preferences.primaryColor },
      secondary: { main: preferences.secondaryColor },
    },
    typography: {
      fontSize: preferences.fontSize,
      fontFamily: preferences.fontFamily,
    },
    shape: {
      borderRadius: preferences.borderRadius,
    },
  });
};
```

## 🎨 CSS-in-JS 样式技巧

### 使用 sx prop

```typescript
// 简单样式
<Box sx={{ p: 2, m: 1, bgcolor: 'primary.main' }} />

// 复杂样式
<Card
  sx={{
    maxWidth: 345,
    bgcolor: 'background.paper',
    boxShadow: 3,
    borderRadius: 2,
    '&:hover': {
      boxShadow: 6,
      transform: 'translateY(-2px)',
    },
    transition: 'all 0.3s ease-in-out',
  }}
/>
```

### 使用 styled API

```typescript
import { styled } from "@mui/material/styles";

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 345,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius * 2,
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    boxShadow: theme.shadows[6],
    transform: "translateY(-2px)",
  },
}));
```

## 🔧 主题调试和工具

### 主题检查器组件

```typescript
const ThemeInspector = () => {
  const theme = useTheme();

  return (
    <Accordion>
      <AccordionSummary>主题配置</AccordionSummary>
      <AccordionDetails>
        <pre>{JSON.stringify(theme.palette, null, 2)}</pre>
      </AccordionDetails>
    </Accordion>
  );
};
```

### 实时主题编辑器

```typescript
const ThemeEditor = () => {
  const [primaryColor, setPrimaryColor] = useState('#1976d2');
  const [secondaryColor, setSecondaryColor] = useState('#dc004e');

  const customTheme = createTheme({
    palette: {
      primary: { main: primaryColor },
      secondary: { main: secondaryColor },
    },
  });

  return (
    <ThemeProvider theme={customTheme}>
      <Stack spacing={2}>
        <input
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
        />
        <input
          type="color"
          value={secondaryColor}
          onChange={(e) => setSecondaryColor(e.target.value)}
        />
        <Button variant="contained">预览按钮</Button>
      </Stack>
    </ThemeProvider>
  );
};
```

## 💡 主题最佳实践

### 1. 一致性原则

- 在整个应用中保持颜色使用的一致性
- 建立清晰的设计语言和规范
- 使用语义化的颜色命名

### 2. 可访问性

```typescript
// 确保颜色对比度符合 WCAG 标准
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      contrastText: "#ffffff", // 确保文字对比度
    },
  },
});
```

### 3. 性能优化

```typescript
// 使用 useMemo 避免重复创建主题
const memoizedTheme = useMemo(() => createTheme(themeOptions), [themeOptions]);
```

### 4. 模块化管理

```typescript
// 分离主题配置
export const colors = {
  primary: "#1976d2",
  secondary: "#dc004e",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
};

export const typography = {
  fontFamily: '"Inter", sans-serif',
  h1: { fontSize: "2.5rem", fontWeight: 700 },
  h2: { fontSize: "2rem", fontWeight: 600 },
};
```

## 🔄 下一步

掌握主题定制后，建议了解：

- [⚙️ 开发指南](./DEVELOPMENT.md) - 深入了解开发工作流
- [🔌 API 开发指南](./API_GUIDE.md) - 创建后端功能
- [📦 部署指南](./DEPLOYMENT.md) - 部署应用到生产环境
