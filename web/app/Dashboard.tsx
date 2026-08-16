"use client";

import { useMemo, useState } from "react";
import { portfolioSnapshot, type ChangeType } from "./lib/portfolio-data";

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
  const positions = useMemo(() => portfolioSnapshot.positions.filter((item) => {
    const normalized = query.trim().toLowerCase();
    return (filter === "ALL" || item.changeType === filter) &&
      (!normalized || item.ticker.toLowerCase().includes(normalized) || item.issuer.toLowerCase().includes(normalized));
  }), [filter, query]);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="FolioPulse 首页">
          <span className="brand-mark"><Icon name="pulse" /></span>
          <span>Folio<span>Pulse</span></span>
        </a>
        <nav aria-label="主导航"><a className="active" href="#overview">概览</a><a href="#holdings">持仓</a><a href="#changes">调仓</a><a href="#method">数据说明</a></nav>
        <button className="watch-button" type="button">+ 加入关注</button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="live-dot" /> SEC 13F 追踪 · 演示快照</div>
        <div className="hero-grid">
          <div><p className="section-kicker">机构持仓档案</p><h1>{portfolioSnapshot.managerShort}</h1><p className="hero-copy">把难读的监管文件，变成一眼看懂的持仓变化。</p></div>
          <div className="filing-card">
            <div><span>最新报告期</span><strong>{portfolioSnapshot.reportDate}</strong></div>
            <div><span>提交日期</span><strong>{portfolioSnapshot.filedAt}</strong></div>
            <div className="filing-source"><Icon name="calendar" /><span>{portfolioSnapshot.source}<small>CIK {portfolioSnapshot.cik}</small></span></div>
          </div>
        </div>
      </section>

      <section className="dashboard-shell" id="overview">
        <div className="metrics-grid">
          <article className="metric-card primary"><span>披露持仓市值</span><strong>${portfolioSnapshot.totalValue.toFixed(2)}B</strong><small>约 2,671.8 亿美元</small></article>
          <article className="metric-card"><span>持仓数量</span><strong>{portfolioSnapshot.positionCount}</strong><small>本季度披露标的</small></article>
          <article className="metric-card positive"><span>新建 / 增持</span><strong>{portfolioSnapshot.changes.NEW + portfolioSnapshot.changes.ADDED}</strong><small>{portfolioSnapshot.changes.NEW} 笔新建仓 · {portfolioSnapshot.changes.ADDED} 笔增持</small></article>
          <article className="metric-card negative"><span>减持 / 清仓</span><strong>{portfolioSnapshot.changes.REDUCED + portfolioSnapshot.changes.EXIT}</strong><small>{portfolioSnapshot.changes.REDUCED} 笔减持 · {portfolioSnapshot.changes.EXIT} 笔清仓</small></article>
        </div>

        <div className="insight-grid">
          <article className="panel allocation-panel">
            <div className="panel-heading"><div><span className="section-kicker">组合结构</span><h2>前五大持仓</h2></div><span className="muted">占总市值</span></div>
            <div className="allocation-list">{portfolioSnapshot.positions.slice(0, 5).map((item, index) => (
              <div className="allocation-row" key={item.ticker}><span className="rank">0{index + 1}</span><div className="allocation-name"><strong>{item.ticker}</strong><small>{item.issuer}</small></div><div className="bar-track"><span style={{ width: `${item.weight / portfolioSnapshot.positions[0].weight * 100}%` }} /></div><strong className="weight">{item.weight.toFixed(2)}%</strong></div>
            ))}</div>
          </article>

          <article className="panel signal-panel" id="changes">
            <span className="section-kicker">本季信号</span><h2>资金动作速览</h2>
            <div className="signal-list">
              <div><span className="signal-icon new">N</span><p><strong>首次买入 STZ</strong><small>约 $3.82B · 新建仓</small></p></div>
              <div><span className="signal-icon up">↗</span><p><strong>继续增持 OXY</strong><small>股份数增加 3.08%</small></p></div>
              <div><span className="signal-icon down">↘</span><p><strong>继续减持 AAPL</strong><small>股份数减少 6.67%</small></p></div>
            </div>
            <a className="text-link" href="#holdings">查看完整调仓记录 <Icon name="arrow" /></a>
          </article>
        </div>

        <section className="panel holdings-panel" id="holdings">
          <div className="holdings-heading"><div><span className="section-kicker">完整明细</span><h2>持仓与变化</h2></div><label className="search-box"><Icon name="search" /><input aria-label="搜索公司或代码" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司或代码" /></label></div>
          <div className="filter-row" role="tablist" aria-label="持仓变化筛选">{filters.map((item) => <button key={item.key} className={filter === item.key ? "selected" : ""} onClick={() => setFilter(item.key)} type="button">{item.label}{item.key !== "ALL" && <span>{portfolioSnapshot.changes[item.key]}</span>}</button>)}</div>
          <div className="table-wrap"><table><thead><tr><th>公司 / 代码</th><th>变化</th><th>当前市值</th><th>组合占比</th><th>股份变化</th></tr></thead><tbody>
            {positions.map((item) => <tr key={item.ticker}>
              <td><div className="company-cell"><span className="ticker-badge">{item.ticker.slice(0, 2)}</span><span><strong>{item.ticker}</strong><small>{item.issuer} · {item.sector}</small></span></div></td>
              <td><span className={`change-tag ${item.changeType.toLowerCase()}`}>{changeLabels[item.changeType]}</span></td>
              <td className="number"><strong>{money(item.value)}</strong></td><td className="number">{item.weight ? `${item.weight.toFixed(2)}%` : "—"}</td>
              <td className={`number ${item.shareChange > 0 ? "gain" : item.shareChange < 0 ? "loss" : ""}`}><strong>{item.shareChange === 0 ? "—" : `${item.shareChange > 0 ? "+" : ""}${compactShares(item.shareChange)}`}</strong>{item.changePercent !== null && item.changePercent !== 0 && <small>{item.changePercent > 0 ? "+" : ""}{item.changePercent.toFixed(2)}%</small>}</td>
            </tr>)}
          </tbody></table>{positions.length === 0 && <div className="empty-state">没有符合条件的持仓</div>}</div>
        </section>
      </section>

      <section className="method" id="method"><div><span className="section-kicker">数据口径</span><h2>来自原始文件，不靠二手摘要</h2></div><p>FolioPulse 读取 SEC EDGAR 的原始 13F-HR 与信息表，按 CUSIP 聚合后比较相邻季度。13F 最长可滞后 45 天，页面只用于研究，不构成投资建议。</p></section>
      <footer><span>FolioPulse · 让机构持仓更易读</span><span>Demo v0.1 · 数据仅供界面验证</span></footer>
    </main>
  );
}
