# FolioPulse

FolioPulse 的第一阶段是一个小型 SEC 13F 数据引擎。V0.01 输入基金的
CIK，从 SEC EDGAR Submissions API 找到最近两份**原始** `13F-HR`，并输出
申报期、提交日期、Accession Number、主文档及 SEC 链接。

当前版本不会解析 Information Table，也不会计算持仓变化。`13F-HR/A`
修订申报会被忽略，避免把修订文件误当成新的季度。

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
以及 SEC 限流错误。

## V0.01 范围

- [x] 规范化为十位 CIK
- [x] 请求 filer submissions JSON
- [x] 找到最近两份原始 `13F-HR`
- [x] 输出人类可读文本或 JSON
- [x] 离线单元测试
- [ ] 解析 13F Information Table（V0.02）
- [ ] 比较季度持仓（V0.03）

