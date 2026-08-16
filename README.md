# FolioPulse

FolioPulse 的第一阶段是一个小型 SEC 13F 数据引擎。V0.02 输入基金的
CIK，从 SEC EDGAR 找到最近两份**原始** `13F-HR`，并可自动定位最新 filing
的 Information Table XML，输出标准化持仓 JSON。

当前版本不会计算季度持仓变化。`13F-HR/A` 修订申报会被忽略，避免把修订
文件误当成新的季度。

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
ticker，因此 V0.02 不会猜测股票代码，ticker 映射留到后续版本。

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
持仓 JSON 导出。

## 当前范围

- [x] 规范化为十位 CIK
- [x] 请求 filer submissions JSON
- [x] 找到最近两份原始 `13F-HR`
- [x] 输出人类可读文本或 JSON
- [x] 离线单元测试
- [x] 定位并解析 13F Information Table（V0.02）
- [x] 输出标准化持仓 JSON
- [ ] 比较季度持仓（V0.03）
