# FolioPulse

FolioPulse 的第一阶段是一个小型 SEC 13F 数据引擎。V0.04 输入基金的
CIK，从 SEC EDGAR 找到最近两份**原始** `13F-HR`，并可自动定位最新 filing
的 Information Table XML，输出标准化持仓 JSON、季度持仓变化并监控新的 filing。

`13F-HR/A` 修订申报会被忽略，避免把修订文件误当成新的季度。

## 要求

- Python 3.10 或更高版本
- 不需要 SEC API Key
- 不需要第三方运行时依赖

SEC 要求自动请求声明带有联系信息的 `User-Agent`。PowerShell 示例：

```powershell
$env:FOLIOPULSE_SEC_USER_AGENT = "FolioPulse your-email@example.com"
python -m backend.main 0001067983
```

不填写 CIK 时，默认使用 Berkshire Hathaway：

```powershell
python -m backend.main
```

也可以直接传入 User-Agent，并输出 JSON：

```powershell
python -m backend.main 0001067983 `
  --user-agent "FolioPulse your-email@example.com" `
  --json
```

下载并解析最新一期完整持仓：

```powershell
python -m backend.main 0001067983 `
  --holdings-output data/berkshire_latest.json
```

程序会自动读取 filing 目录，识别根元素为 `informationTable` 的 XML，并把每行
转换成包含 issuer、CUSIP、可选 FIGI、shares、value 和 voting authority 的 JSON。

SEC 从 2023 年 1 月 3 日起把 13F `value` 改为按美元报告；程序会把旧 filing
的千美元数值乘以 1,000，统一输出 `value_usd`。13F Information Table 通常不含
ticker，因此当前版本不会猜测股票代码，ticker 映射留到后续版本。

比较最近两个季度并导出变化：

```powershell
python -m backend.main 0001067983 `
  --changes-output data/berkshire_changes.json
```

变化引擎先按 `CUSIP + Put/Call + SH/PRN` 合并同一证券的拆分行，再根据报告
数量分类：

- `NEW`：上一季度没有，本季度出现
- `ADDED`：本季度数量增加
- `REDUCED`：本季度数量减少
- `UNCHANGED`：数量未变
- `EXIT`：上一季度存在，本季度消失

比较使用 shares/principal amount，而不是随股价变化的市值。每条变化同时输出
previous/current amount、差额、百分比和两期报告市值。

## 监控新的 13F

先执行一次检查并建立基线：

```powershell
python -m backend.filing_watcher 0001067983 --once
```

首次运行会显示 `INITIALIZED`，并把最新 accession 写入
`data/watcher_state.json`，不会把已有 filing 误报成新事件。再次检查时，相同
accession 显示 `UNCHANGED`；检测到更晚的 filing 时显示 `NEW_FILING`。

持续监控，默认每 60 秒检查一次：

```powershell
python -m backend.filing_watcher 0001067983
```

可用 `Ctrl+C` 安全停止。也可以通过 `--interval 120` 调整轮询秒数，或使用
`--json` 输出单行 JSON 事件。Watcher 使用同一个 `FOLIOPULSE_SEC_USER_AGENT`
环境变量，并且状态文件已被 `.gitignore` 排除。

## 预期输出

```text
FolioPulse SEC Tracker

Fund: BERKSHIRE HATHAWAY INC
CIK: 0001067983

Latest 13F-HR
Form: 13F-HR
Report period: ...
Filed: ...
Accession: ...
Primary document: ...
URL: ...

Previous 13F-HR
...
```

## 测试

测试全部使用固定的本地样本，不会请求 SEC：

```powershell
python -m unittest discover -s tests -v
```

测试覆盖 CIK 规范化、排除修订申报、历史 submissions 文件、无 13F 结果，
SEC 限流、Information Table 发现、XML 命名空间、可选 FIGI、数值单位转换和
持仓 JSON 导出，以及重复行聚合、期权分离和五类季度变化。
Watcher 测试还覆盖首次基线、无变化、新 filing、旧结果保护和损坏状态保护。

## 当前范围

- [x] 规范化为十位 CIK
- [x] 请求 filer submissions JSON
- [x] 找到最近两份原始 `13F-HR`
- [x] 输出人类可读文本或 JSON
- [x] 离线单元测试
- [x] 定位并解析 13F Information Table（V0.02）
- [x] 输出标准化持仓 JSON
- [x] 比较季度持仓并分类变化（V0.03）
- [x] 输出季度 changes JSON
- [x] 监控新的原始 13F-HR（V0.04）
- [x] 原子保存 watcher accession 状态
