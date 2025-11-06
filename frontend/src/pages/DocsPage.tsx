import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  useTheme,
  Stack,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  VpnKey as KeyIcon,
  Security as SecurityIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function DocsPage() {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 获取真实域名
  const domain = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const username = isAuthenticated && user ? user.username : "your-username";
  const isRealUser = isAuthenticated && user;

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <Paper
      sx={{
        p: 2,
        bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
        fontFamily: "monospace",
        fontSize: "0.875rem",
        position: "relative",
        overflow: "auto",
      }}
    >
      <Tooltip title={copiedCode === id ? "已复制！" : "复制代码"}>
        <IconButton
          size="small"
          onClick={() => handleCopyCode(code, id)}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          使用文档
        </Typography>
        <Typography variant="body1" color="text.secondary">
          快速了解 NekroEndpoint 平台的核心功能和使用方法
        </Typography>
      </Box>

      {/* 快速开始 */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <CheckIcon color="success" /> 快速开始
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
            用户激活说明
          </Typography>
          <Typography variant="body2">
            • 新注册用户默认<strong>未激活</strong>，可以创建和管理端点，但无法发布到公网
            <br />• 联系管理员激活账号后，即可发布端点并使其通过 <code>/e/用户名/路径</code> 公开访问
          </Typography>
        </Alert>

        <List>
          <ListItem>
            <ListItemText
              primary="1. 使用 GitHub 登录"
              secondary="点击顶部导航栏的 'GitHub 登录' 按钮，授权后自动创建账号"
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="2. 创建第一个端点" secondary="进入「端点管理」页面，点击 '新建端点' 按钮开始创建" />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. 配置端点内容"
              secondary="根据需求选择端点类型（静态内容、代理、脚本），填写配置信息"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="4. 发布端点（需激活）"
              secondary={
                isRealUser
                  ? `保存后点击 '发布' 按钮，端点将通过 ${domain}/e/${username}/your-path 访问`
                  : `保存后点击 '发布' 按钮，端点将通过 ${domain}/e/your-username/your-path 访问`
              }
            />
          </ListItem>
        </List>
        {isRealUser && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>你的端点访问前缀：</strong>{" "}
              <code>
                {domain}/e/{username}/
              </code>
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* 端点类型 */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <CodeIcon color="primary" /> 端点类型
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Stack spacing={3}>
          {/* 静态端点 */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip label="Static" color="default" size="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  静态端点
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                返回预定义的静态内容，适用于配置文件、JSON 数据、文本内容等场景。
              </Typography>

              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} gutterBottom>
                  💡 实战案例：托管 Clash 订阅配置
                </Typography>
                <Typography variant="body2" gutterBottom>
                  将 Clash 配置文件托管在边缘节点，随时随地更新和分享订阅链接。
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                第 1 步：创建端点
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="在端点管理页面点击「新建端点」"
                    secondary="填写名称（如'Clash订阅'）和路径（如'/clash-config'）"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="端点类型选择「Static」" secondary="用于托管静态配置文件" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="访问控制选择「authenticated」"
                    secondary="需要访问密钥才能访问，保护配置安全"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                第 2 步：配置内容
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                创建端点后，在右侧编辑器中：
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. 将 Content-Type 设为「text/yaml」"
                    secondary="让 Clash 客户端正确识别配置格式"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. 在编辑器中粘贴你的 Clash 配置" secondary="支持语法高亮" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. 点击「保存」按钮" />
                </ListItem>
              </List>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                <strong>Clash 配置示例：</strong>
              </Typography>
              <CodeBlock
                id="static-config"
                code={`port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info

proxies:
  - name: "US Server"
    type: ss
    server: us.example.com
    port: 8388
    cipher: aes-256-gcm
    password: your-password

  - name: "HK Server"
    type: vmess
    server: hk.example.com
    port: 443
    uuid: your-uuid
    alterId: 0
    cipher: auto`}
              />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                第 3 步：生成访问密钥
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                在 Clash 客户端添加订阅：
              </Typography>
              <CodeBlock
                id="clash-subscription"
                code={`${domain}/e/${username}/clash-config?access_key=ep-your-access-key`}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>优势：</strong>配置更新后无需重新分发链接，客户端自动获取最新配置！
                </Typography>
              </Alert>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                💡 更多实战案例
              </Typography>

              {/* 案例 2 - Accordion */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    案例 2：API Mock 数据
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    创建端点，Content-Type 选择「application/json」，在编辑器中填写：
                  </Typography>
                  <CodeBlock
                    id="api-mock"
                    code={`{
  "code": 200,
  "message": "success",
  "data": {
    "users": [
      {"id": 1, "name": "Alice"},
      {"id": 2, "name": "Bob"}
    ]
  }
}`}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    快速搭建前端开发用的 Mock API，访问控制设为 public 即可公开访问
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* 案例 3 - Accordion */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    案例 3：HTML 公告页面
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    创建端点，Content-Type 选择「text/html」，在编辑器中填写：
                  </Typography>
                  <CodeBlock
                    id="notice"
                    code={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>系统维护通知</title>
</head>
<body>
  <h1>系统维护通知</h1>
  <p>将于今晚 22:00-24:00 进行系统升级</p>
  <p>升级期间服务暂时不可用，感谢理解</p>
</body>
</html>`}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    发布 HTML 格式的通知页面，直接在浏览器访问
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>

          {/* 代理端点 */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip label="Proxy" color="primary" size="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  代理端点
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                转发请求到目标 URL，支持自定义请求头和路径映射，适用于单文件代理、API 转发等场景。
              </Typography>

              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} gutterBottom>
                  💡 实战案例：代理 GitHub API
                </Typography>
                <Typography variant="body2" gutterBottom>
                  通过边缘节点加速访问 GitHub API，避免直连限制。
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                第 1 步：创建代理端点
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="在端点管理页面点击「新建端点」"
                    secondary="填写名称（如'GitHub Release'）和路径（如'/gh-release'）"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="端点类型选择「Proxy」" secondary="用于转发请求到目标服务器" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="访问控制选择「public」" secondary="允许公开访问" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                第 2 步：配置代理参数
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                创建端点后，在右侧配置表单中填写：
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="目标 URL"
                    secondary="https://api.github.com/repos/anthropics/anthropic-sdk-python/releases/latest"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="路径映射" secondary="保持默认的 ${path} 即可（用于简单代理）" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="超时时间" secondary="15000 毫秒（15秒）" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="请求头"
                    secondary="点击「添加」按钮，添加 Header：Accept = application/vnd.github+json"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                第 3 步：发布并使用
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                保存后点击「发布」，然后访问：
              </Typography>
              <CodeBlock id="github-release-access" code={`curl ${domain}/e/${username}/gh-release`} />

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>效果：</strong>通过 Cloudflare 边缘节点访问，避免直连 GitHub API，更快更稳定！
                </Typography>
              </Alert>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                💡 更多实战案例
              </Typography>

              {/* 案例 2 - Accordion */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    案例 2：隐藏第三方 API 密钥
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    配置参数（将 API Key 隐藏在目标 URL 中）：
                  </Typography>
                  <List dense sx={{ mb: 2 }}>
                    <ListItem>
                      <ListItemText
                        primary="目标 URL"
                        secondary="https://api.weatherapi.com/v1/current.json?key=your-api-key&q=Beijing"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="路径映射" secondary="保持默认 ${path}" />
                    </ListItem>
                  </List>
                  <Typography variant="body2" color="text.secondary">
                    前端直接访问你的代理端点，API 密钥不会暴露在客户端代码中
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* 案例 3 - Accordion */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    案例 3：代理单个图片资源
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    为特定图片创建代理端点（如 /my-avatar）：
                  </Typography>
                  <List dense sx={{ mb: 2 }}>
                    <ListItem>
                      <ListItemText primary="目标 URL" secondary="https://example.com/images/avatar.jpg" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="路径映射" secondary="保持默认 ${path}" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="超时时间" secondary="20000 毫秒（图片可能较大）" />
                    </ListItem>
                  </List>
                  <Typography variant="body2" color="text.secondary">
                    通过边缘节点加速图片访问，每个图片需创建独立端点
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                📘 路径映射（Path Mapping）说明
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                路径映射用于控制最终请求的 URL 构造方式，默认值为 <code>${"{path}"}</code>（代表端点自身的路径）。
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>常见使用场景：</strong>
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="简单代理（推荐）" secondary="保持默认 ${path}，直接将请求转发到目标 URL" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="URL 路径转换"
                    secondary={`例如：目标 URL 是 https://api.example.com，路径映射设为 /v2${"{path}"}，则最终请求 https://api.example.com/v2/your-endpoint-path`}
                  />
                </ListItem>
              </List>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>提示：</strong>大多数情况下使用默认的 <code>${"{path}"}</code> 即可满足需求。
                </Typography>
              </Alert>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
                  ⚠️ 路径匹配说明
                </Typography>
                <Typography variant="body2">
                  • 每个端点路径必须<strong>精确匹配</strong>访问路径
                  <br />• 不支持通配符，如 <code>/gh-raw/*</code> 的写法无效
                  <br />
                  • 适用于代理单个 URL 或固定路径的 API
                  <br />• 如需代理多个路径，请为每个路径创建独立端点
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          {/* 脚本端点 */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip label="Script" color="secondary" size="small" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  脚本端点（开发中）
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                在边缘节点运行自定义 JavaScript 代码，实现动态逻辑处理。
              </Typography>
              <Alert severity="info">
                <Typography variant="body2">此功能计划在 Phase 3 推出，敬请期待！</Typography>
              </Alert>
            </CardContent>
          </Card>
        </Stack>
      </Paper>

      {/* 权限控制 */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <KeyIcon color="success" /> 权限控制
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="body1" paragraph color="text.secondary">
          通过权限组和访问密钥系统，实现端点的细粒度访问控制。
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          工作流程
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="1. 创建权限组"
              secondary="在「权限组」页面创建权限组，如 'VIP 用户'、'免费试用' 等"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. 生成访问密钥"
              secondary="为权限组生成访问密钥（格式：ep-xxxxxxxx），支持设置到期时间和备注"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. 端点关联权限组"
              secondary="编辑端点时，将访问控制设为 'authenticated'，并选择所需权限组"
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="4. 客户端携带密钥访问" secondary="通过 HTTP Header 或 Query 参数传递访问密钥" />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
            安全提示
          </Typography>
          <Typography variant="body2">
            • 访问密钥仅在创建时显示一次，请妥善保存
            <br />• 密钥泄露后可随时撤销，不影响其他密钥
            <br />• 建议为不同用户群体创建独立的权限组
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          客户端访问示例
        </Typography>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          方式一：HTTP Header
        </Typography>
        <CodeBlock
          id="header-example"
          code={`curl -H "X-Access-Key: ep-your-access-key" \\
  ${domain}/e/${username}/endpoint-path`}
        />

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
          方式二：Query 参数
        </Typography>
        <CodeBlock
          id="query-example"
          code={`curl "${domain}/e/${username}/endpoint-path?access_key=ep-your-access-key"`}
        />
        {isRealUser && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>提示：</strong>将 <code>endpoint-path</code> 替换为你创建的端点路径（如 <code>/my-api</code>
              ），将 <code>ep-your-access-key</code> 替换为实际生成的访问密钥
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* 端点访问 */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon color="info" /> 端点访问
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="body1" paragraph color="text.secondary">
          已发布的端点通过统一的 URL 格式访问：
        </Typography>

        <CodeBlock id="url-format" code={`${domain}/e/{username}/{endpoint-path}`} />

        {isRealUser && (
          <Alert severity="success" sx={{ mt: 2, mb: 3 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
              你的端点访问格式：{domain}/e/{username}/<strong>{"<端点路径>"}</strong>
            </Typography>
          </Alert>
        )}

        <List sx={{ mt: 3 }}>
          <ListItem>
            <ListItemText
              primary="username"
              secondary={isRealUser ? `你的用户名：${username}` : "你的用户名（GitHub 用户名）"}
              primaryTypographyProps={{ fontFamily: "monospace" }}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="endpoint-path"
              secondary="端点的路径，如 /clash-config 或 /api/data"
              primaryTypographyProps={{ fontFamily: "monospace" }}
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
            访问限制
          </Typography>
          <Typography variant="body2">
            • 仅已激活且已发布的端点可访问
            <br />• 用户停用后，其所有端点将立即无法访问
            <br />• 访问控制为 'authenticated' 的端点需要提供有效的访问密钥
          </Typography>
        </Alert>
      </Paper>

      {/* 管理员功能 */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon color="error" /> 管理员功能
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            以下功能仅限管理员角色使用，首次部署时需访问 <code>/init</code> 页面设置管理员。
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          用户管理
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="激活用户" secondary="允许用户发布端点到公网，使其可被访问" />
          </ListItem>
          <ListItem>
            <ListItemText primary="停用用户" secondary="该用户所有端点将立即无法访问（可逆操作）" />
          </ListItem>
          <ListItem>
            <ListItemText primary="删除用户" secondary="永久删除用户及其所有数据（不可逆，谨慎操作）" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
          内容审查 (计划中)
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="查看用户端点" secondary="查看任意用户的所有端点及其配置" />
          </ListItem>
          <ListItem>
            <ListItemText primary="强制下线端点" secondary="将违规端点强制设为未发布状态" />
          </ListItem>
        </List>
      </Paper>

      {/* 常见问题 */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          常见问题
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Q: 为什么我无法发布端点？
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              新注册用户默认未激活，需要联系管理员激活账号后才能发布端点。激活前可以正常创建和编辑端点。
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Q: 代理端点支持哪些请求方法？
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              支持所有 HTTP 方法（GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS 等），请求体和请求头会被转发到目标 URL。
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Q: 如何成为管理员？
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              首次部署后，访问 <code>/init</code>{" "}
              页面可设置第一个管理员。之后该页面会被禁用，只能由现有管理员在管理后台手动变更用户角色。
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Q: 端点访问有速率限制吗？
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              目前暂无速率限制，但建议合理使用。未来可能会根据实际情况添加限流机制。
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* 底部提示 */}
      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Alert severity="success" sx={{ maxWidth: 600, mx: "auto" }}>
          <Typography variant="body2">
            如有其他问题，请通过 GitHub Issues 联系我们，或查阅项目仓库中的详细文档。
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}
