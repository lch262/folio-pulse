# FolioPulse Web

面向用户的 13F 持仓变化仪表盘，基于 vinext、React 和 OpenAI Sites 构建。

```powershell
npm install
npm run dev
```

页面通过 D1 持久化基金、申报与持仓记录。首次请求会写入用于界面验证的演示
快照；`GET /api/portfolio` 返回最新报告期，受管理员账号保护的
`POST /api/portfolio` 可导入同一数据结构。

登录后的管理员可以在页面右上角选择 Python 引擎通过
`--web-snapshot-output` 生成的 JSON。导入成功后，概览、信号和持仓表会立即更新。
