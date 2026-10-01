# 设计系统与主题（Signal）

前端的视觉语言叫 **Signal**，完整设计说明见 `docs/REDESIGN.md` §2。本文只说明如何在代码里使用它。

## 两套主题

| 主题 | 名称 | 气质 |
|---|---|---|
| 暗色（默认） | Deep Field | 深空、点阵、用光表达层级 |
| 亮色 | Lab Paper | 暖白图纸、墨线、用实线表达层级 |

主题由 `<html data-theme="dark|light">` 决定：

- `src/utils/htmlTemplate.ts` 的 `THEME_BOOT_SCRIPT` 在 hydrate 之前读取 localStorage 的 `themeMode`（`dark` / `light` / `system`）并写入该属性，避免首屏闪烁。
- `frontend/src/context/ThemeContextProvider.tsx` 的 `useAppTheme()` 提供 `themeMode`（实际生效的明暗）、`preference`、`setPreference`、`toggleTheme`。

## 令牌

全部定义在 `frontend/src/design/tokens.css`，并在 `frontend/src/styles.css` 的 `@theme inline` 中映射为 Tailwind 类名。

| 用途 | 令牌 / 类名 | 含义 |
|---|---|---|
| 背景 | `bg-bg`、`bg-field`（点阵 + 光晕） | 页面空间 |
| 面 | `bg-surface-0 … surface-3`、`bg-surface-solid`、`glass` | 由浅入深的层级；`glass` 为半透明加背景模糊 |
| 线 | `border-line`、`--line-strong` | 分隔与描边 |
| 文本 | `text-ink-1 … ink-4` | 正文到最弱提示 |
| 信号 | `text-signal`、`bg-signal-soft`、`shadow-signal` | 公开、已发布、在线 |
| 通行 | `text-pass`、`bg-pass-soft`、`shadow-pass` | 鉴权、通行卡、权限组 |
| 路由 | `text-route`、`bg-route-soft` | 代理、上游主机 |
| 注意 / 危险 | `caution`、`danger` | 待处理、即将过期；删除、吊销 |
| 品牌渐变 | `--brand-gradient`、`text-brand` | **只**用于品牌标识、通行卡、落地页 |

字体：界面文字为 Geist（中文回退系统字体），路径、密钥、代码一律使用 `font-mono`（Geist Mono）。

## 规则

1. 组件只使用语义令牌，**不硬编码颜色，不判断当前主题**。
2. 只有不能读取 CSS 变量的第三方库（Monaco、sonner）可以使用 `useAppTheme().themeMode`；Monaco 的两套主题定义在 `frontend/src/design/code-editor.tsx`。
3. 颜色有含义：不要把 `signal` 用作装饰色，也不要用 `pass` 表示与鉴权无关的东西。
4. 新增令牌时，必须在 `:root, [data-theme="dark"]` 与 `[data-theme="light"]` 两处同时定义，再在 `styles.css` 中映射。

## 动效

- 预设在 `frontend/src/design/motion.ts`：`snap`（交互反馈）、`glide`（浮层、共享元素）、`ignite`（发布成功的一次性点火）。
- 组件从 `motion/react` 导入 `m as motion`；`app/providers.tsx` 用 `LazyMotion strict` 异步加载动画特性包。
- 动效只表达状态变化，不做持续循环的装饰动画；系统开启「减少动态效果」时自动降级。

## 原语

`frontend/src/ui/` 下是基于 Radix 的原语（Button、Dialog、DropdownMenu、Popover、Select、Tabs、Switch、Segmented、Field、Tooltip、Toaster 等），以及 `useConfirm()` 确认对话框。优先复用，新原语保持相同的写法：`cn()` 合并类名，`cva` 定义变体。
