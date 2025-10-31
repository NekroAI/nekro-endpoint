-- Seed data for the features table

-- Clear existing data to ensure a clean slate on every seed.
DELETE FROM features;

-- Reset the autoincrement sequence for SQLite.
-- This ensures that IDs start from 1 every time we re-seed.
DELETE FROM sqlite_sequence WHERE name = 'features';

-- Insert new seed data.
INSERT INTO
  features (key, name, description, enabled)
VALUES
  (
    'e2e-type-safety',
    '端到端类型安全',
    '从数据库 Schema 到前端组件，全程采用 TypeScript 和 Zod 校验，智能提示无处不在，彻底告别运行时类型错误。',
    1
  ),
  (
    'hybrid-rendering',
    '混合渲染模式',
    '集成了 Vite 的热更新（HMR）用于开发，同时支持生产环境下的服务器端渲染（SSR），兼顾开发效率与生产性能。',
    1
  ),
  (
    'dev-experience',
    '极致开发体验',
    '通过 Hono 的轻量级框架和 React 的现代生态，提供无与伦比的开发体验。代码简洁，逻辑清晰。',
    1
  ),
  (
    'production-ready',
    '生产级就绪',
    '基于 Cloudflare 全球网络构建，整合了 Pages, Workers 和 D1 数据库，提供高可用、低延迟的生产级部署方案。',
    1
  ),
  (
    'high-performance',
    '性能卓越',
    'Hono 后端和优化的前端构建确保了应用的快速响应。无论是 API 还是页面加载，都力求极致性能。',
    1
  ),
  (
    'one-click-deploy',
    '一键部署',
    '简化的构建和部署流程，只需一个命令即可将您的全栈应用部署到 Cloudflare 的边缘网络上，轻松便捷。',
    1
  ); 