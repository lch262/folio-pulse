"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { portfolioSnapshot, type ChangeType, type PortfolioSnapshot } from "./lib/portfolio-data";

const filters: Array<{ key: "ALL" | ChangeType; label: string }> = [
  { key: "ALL", label: "全部" }, { key: "NEW", label: "新建仓" },
  { key: "ADDED", label: "增持" }, { key: "REDUCED", label: "减持" },
  { key: "EXIT", label: "清仓" },
];

const changeLabels: Record<ChangeType, string> = {
  NEW: "新建仓", ADDED: "增持", REDUCED: "减持", EXIT: "清仓", UNCHANGED: "未变",
};

function money(value: number) { return value === 0 ? "—" : `$${value.toFixed(2)}B`; }
function compactShares(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function Icon({ name }: { name: "pulse" | "search" | "arrow" | "calendar" }) {
  const paths = {
    pulse: <path d="M3 12h4l2.2-6 4.4 12 2.2-6H21" />,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function Dashboard() {
  const [filter, setFilter] = useState<"ALL" | ChangeType>("ALL");
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(portfolioSnapshot);
  const [storageStatus, setStorageStatus] = useState("正在连接数据层");
  const [importState, setImportState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/portfolio")
      .then((response) => response.json())
      .then((payload) => {
        if (!active || !payload?.data) return;
        setSnapshot(payload.data);
        setStorageStatus(payload.meta?.status === "persistent" ? "持久化快照" : "演示快照");
      })
      .catch(() => active && setStorageStatus("演示快照"));
    return () => { active = false; };
  }, []);

  const positions = useMemo(() => snapshot.positions.filter((item) => {
    const normalized = query.trim().toLowerCase();
    return (filter === "ALL" || item.changeType === filter) &&
      (!normalized || item.ticker.toLowerCase().includes(normalized) || item.issuer.toLowerCase().includes(normalized));
  }), [filter, query, snapshot]);

  const signals = useMemo(
    () => snapshot.positions.filter((item) => item.changeType !== "UNCHANGED").slice(0, 3),
    [snapshot],
  );

  async function importSnapshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImportState("error");
      setImportMessage("文件超过 5 MB，请确认选择的是网站快照 JSON。 ");
      return;
    }
    setImportState("uploading");
    setImportMessage("正在验证并导入快照…");
    try {
      const payload = JSON.parse(await file.text());
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入失败。");
      setSnapshot(result.data);
      setFilter("ALL");
      setQuery("");
      setStorageStatus("已导入快照");
      setImportState("success");
      setImportMessage(`已导入 ${result.data.reportDate} 报告期，共 ${result.data.positionCount} 个持仓。`);
    } catch (error) {
      setImportState("error");
      setImportMessage(error instanceof Error ? error.message : "无法读取该 JSON 文件。");
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FolioPulse 首页">
          <span className="brand-mark"><Icon name="pulse" /></span>
          <span>Folio<span>Pulse</span></span>
        </a>
        <nav aria-label="主导航"><a className="active" href="#overview">概览</a><a href="#holdings">持仓</a><a href="#changes">调仓</a><a href="#method">数据说明</a></nav>
        <div className="header-actions">
          <input ref={importInput} className="import-input" type="file" accept="application/json,.json" onChange={importSnapshot} />
          <button className="watch-button" type="button" disabled={importState === "uploading"} onClick={() => importInput.current?.click()}>{importState === "uploading" ? "导入中…" : "导入快照"}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="live-dot" /> SEC 13F 追踪 · {storageStatus}</div>
        <div className="hero-grid">
          <div><p className="section-kicker">机构持仓档案</p><h1>{snapshot.managerShort}</h1><p className="hero-copy">把难读的监管文件，变成一眼看懂的持仓变化。</p></div>
          <div className="filing-card">
            <div><span>最新报告期</span><strong>{snapshot.reportDate}</strong></div>
            <div><span>提交日期</span><strong>{snapshot.filedAt}</strong></div>
            <div className="filing-source"><Icon name="calendar" /><span>{snapshot.source}<small>CIK {snapshot.cik}</small></span></div>
          </div>
        </div>
      </section>

      <section className="dashboard-shell" id="overview">
        <div className="metrics-grid">
          <article className="metric-card primary"><span>披露持仓市值</span><strong>${snapshot.totalValue.toFixed(2)}B</strong><small>约 {(snapshot.totalValue * 10).toLocaleString("zh-CN")} 亿美元</small></article>
          <article className="metric-card"><span>持仓数量</span><strong>{snapshot.positionCount}</strong><small>本季度披露标的</small></article>
          <article className="metric-card positive"><span>新建 / 增持</span><strong>{snapshot.changes.NEW + snapshot.changes.ADDED}</strong><small>{snapshot.changes.NEW} 笔新建仓 · {snapshot.changes.ADDED} 笔增持</small></article>
          <article className="metric-card negative"><span>减持 / 清仓</span><strong>{snapshot.changes.REDUCED + snapshot.changes.EXIT}</strong><small>{snapshot.changes.REDUCED} 笔减持 · {snapshot.changes.EXIT} 笔清仓</small></article>
        </div>

        <div className="insight-grid">
          <article className="panel allocation-panel">
            <div className="panel-heading"><div><span className="section-kicker">组合结构</span><h2>前五大持仓</h2></div><span className="muted">占总市值</span></div>
            <div className="allocation-list">{snapshot.positions.slice(0, 5).map((item, index) => (
              <div className="allocation-row" key={item.ticker}><span className="rank">0{index + 1}</span><div className="allocation-name"><strong>{item.ticker}</strong><small>{item.issuer}</small></div><div className="bar-track"><span style={{ width: `${item.weight / Math.max(snapshot.positions[0]?.weight ?? 1, 1) * 100}%` }} /></div><strong className="weight">{item.weight.toFixed(2)}%</strong></div>
            ))}</div>
          </article>

          <article className="panel signal-panel" id="changes">
            <span className="section-kicker">本季信号</span><h2>资金动作速览</h2>
            <div className="signal-list">{signals.map((item, index) => {
              const signalClass = item.changeType === "NEW" ? "new" : item.changeType === "ADDED" ? "up" : "down";
              const signalMark = item.changeType === "NEW" ? "N" : item.changeType === "ADDED" ? "↗" : "↘";
              const detail = item.changePercent === null ? money(item.value) : `${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`;
              return <div key={`${item.ticker}-${index}`}><span className={`signal-icon ${signalClass}`}>{signalMark}</span><p><strong>{changeLabels[item.changeType]} {item.ticker}</strong><small>{item.issuer} · {detail}</small></p></div>;
            })}</div>
            <a className="text-link" href="#holdings">查看完整调仓记录 <Icon name="arrow" /></a>
          </article>
        </div>

        <section className="panel holdings-panel" id="holdings">
          <div className="holdings-heading"><div><span className="section-kicker">完整明细</span><h2>持仓与变化</h2></div><label className="search-box"><Icon name="search" /><input aria-label="搜索公司或代码" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司或代码" /></label></div>
          <div className="filter-row" role="tablist" aria-label="持仓变化筛选">{filters.map((item) => <button key={item.key} className={filter === item.key ? "selected" : ""} onClick={() => setFilter(item.key)} type="button">{item.label}{item.key !== "ALL" && <span>{snapshot.changes[item.key]}</span>}</button>)}</div>
          <div className="table-wrap"><table><thead><tr><th>公司 / 代码</th><th>变化</th><th>当前市值</th><th>组合占比</th><th>股份变化</th></tr></thead><tbody>
            {positions.map((item, index) => <tr key={`${item.ticker}-${item.changeType}-${index}`}>
              <td><div className="company-cell"><span className="ticker-badge">{item.ticker.slice(0, 2)}</span><span><strong>{item.ticker}</strong><small>{item.issuer} · {item.sector}</small></span></div></td>
              <td><span className={`change-tag ${item.changeType.toLowerCase()}`}>{changeLabels[item.changeType]}</span></td>
              <td className="number"><strong>{money(item.value)}</strong></td><td className="number">{item.weight ? `${item.weight.toFixed(2)}%` : "—"}</td>
              <td className={`number ${item.shareChange > 0 ? "gain" : item.shareChange < 0 ? "loss" : ""}`}><strong>{item.shareChange === 0 ? "—" : `${item.shareChange > 0 ? "+" : ""}${compactShares(item.shareChange)}`}</strong>{item.changePercent !== null && item.changePercent !== 0 && <small>{item.changePercent > 0 ? "+" : ""}{item.changePercent.toFixed(2)}%</small>}</td>
            </tr>)}
          </tbody></table>{positions.length === 0 && <div className="empty-state">没有符合条件的持仓</div>}</div>
        </section>
      </section>

      <section className="method" id="method"><div><span className="section-kicker">数据口径</span><h2>来自原始文件，不靠二手摘要</h2></div><p>FolioPulse 读取 SEC EDGAR 的原始 13F-HR 与信息表，按 CUSIP 聚合后比较相邻季度。13F 最长可滞后 45 天，页面只用于研究，不构成投资建议。</p></section>
      {importMessage && <div className={`import-toast ${importState}`} role="status"><strong>{importState === "success" ? "导入完成" : importState === "error" ? "导入未完成" : "正在处理"}</strong><span>{importMessage}</span><button type="button" aria-label="关闭提示" onClick={() => setImportMessage("")}>×</button></div>}
      <footer><span>FolioPulse · 让机构持仓更易读</span><span>v0.3 · SEC 快照导入已启用</span></footer>
    </main>
  );
}
