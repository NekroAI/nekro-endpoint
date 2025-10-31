const analyticsDashboard = `
<div style="background-color: #1a1a1a; color: #f0f0f0; font-family: sans-serif; display: flex; flex-direction: column; padding: 12px; gap: 10px;">
  <div style="font-size: 14px; font-weight: bold;">分析仪表盘</div>
  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; flex-grow: 1;">
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="background-color: #2a2a2a; border-radius: 6px; padding: 8px; flex-grow: 1; display: flex; flex-direction: column;">
        <div style="font-size: 10px; opacity: 0.7;">实时访问量</div>
        <div style="flex-grow: 1; background: linear-gradient(to top, #58e, #58e 30%, transparent 30%, transparent 40%, #58e 40%, #58e 60%, transparent 60%); margin-top: 10px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; height: 80px;">
        <div style="background-color: #2a2a2a; border-radius: 6px; padding: 8px;"><div style="font-size: 10px; opacity: 0.7;">新增用户</div><div style="font-size: 18px; font-weight: bold; margin-top: 5px;">1,234</div></div>
        <div style="background-color: #2a2a2a; border-radius: 6px; padding: 8px;"><div style="font-size: 10px; opacity: 0.7;">平均在线</div><div style="font-size: 18px; font-weight: bold; margin-top: 5px;">5.6 min</div></div>
      </div>
    </div>
    <div style="background-color: #2a2a2a; border-radius: 6px; padding: 8px; display: flex; flex-direction: column;">
      <div style="font-size: 10px; opacity: 0.7;">流量来源</div>
      <div style="flex-grow: 1; border-radius: 50%; background: conic-gradient(#58e 0% 40%, #1c9 40% 75%, #f7b 75% 100%); margin: 10px 5px;"></div>
    </div>
  </div>
</div>
`;

const cmsBackend = `
<div style="background-color: #f5f5f5; font-family: sans-serif; display: flex; padding: 12px; gap: 10px;">
  <div style="width: 120px; background-color: #e0e0e0; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 8px;">
    <div style="font-size: 12px; font-weight: bold;">内容管理</div>
    <div style="height: 20px; background-color: #d0d0d0; border-radius: 4px;"></div>
    <div style="height: 20px; background-color: #c0c0c0; border-radius: 4px;"></div>
    <div style="height: 20px; background-color: #d0d0d0; border-radius: 4px;"></div>
  </div>
  <div style="flex-grow: 1; background-color: #fff; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 10px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 12px; font-weight: bold;">文章列表</div>
      <div style="height: 24px; width: 60px; background-color: #4a90e2; border-radius: 4px;"></div>
    </div>
    <div style="height: 30px; background-color: #f0f0f0; border-radius: 4px;"></div>
    <div style="height: 30px; background-color: #f0f0f0; border-radius: 4px;"></div>
    <div style="height: 30px; background-color: #f0f0f0; border-radius: 4px;"></div>
  </div>
</div>
`;

const iotControlPanel = `
<div style="background: linear-gradient(to bottom, #2c3e50, #34495e); color: #ecf0f1; font-family: sans-serif; display: flex; flex-direction: column; padding: 12px; gap: 10px;">
  <div style="font-size: 14px; font-weight: bold;">IoT 设备控制台</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; flex-grow: 1;">
    <div style="background-color: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
      <div style="font-size: 10px; opacity: 0.8;">客厅灯</div>
      <div style="height: 30px; width: 50px; background-color: #2ecc71; border-radius: 15px; margin: 10px auto;"></div>
      <div style="font-size: 10px; text-align: center;">状态: 开启</div>
    </div>
    <div style="background-color: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
      <div style="font-size: 10px; opacity: 0.8;">空调</div>
      <div style="font-size: 24px; font-weight: bold; text-align: center; margin-top: 5px;">24°C</div>
      <div style="height: 4px; background-color: #3498db; border-radius: 2px; margin-top: 8px;"></div>
    </div>
    <div style="background-color: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px;">
      <div style="font-size: 10px; opacity: 0.8;">安防摄像头</div>
      <div style="height: 40px; background-color: #e74c3c; border-radius: 4px; margin-top: 10px; display: flex; align-items: center; justify-content: center; font-size: 8px;">REC</div>
    </div>
  </div>
  <div style="background-color: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; font-size: 10px;">日志: 设备 A 连接成功...</div>
</div>
`;

export const usecases = [
  {
    title: "实时分析仪表盘",
    description: "利用 Cloudflare Workers 的低延迟特性，构建高性能的实时数据监控和分析平台。",
    htmlContent: analyticsDashboard,
  },
  {
    title: "动态博客或CMS后台",
    description: "结合 D1 数据库和 Hono 的路由能力，轻松创建功能强大的内容管理系统。",
    htmlContent: cmsBackend,
  },
  {
    title: "IoT 设备管理面板",
    description: "通过 Hono 的 API 和 React 的前端交互，实现对物联网设备的远程监控和管理。",
    htmlContent: iotControlPanel,
  },
];
