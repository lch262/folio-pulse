"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- full-page navigation avoids a deployed Sites client-router stall */

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./components/SiteHeader";
import { portfolioSnapshot, type ChangeType, type PortfolioSnapshot, type Position } from "./lib/portfolio-data";

const changeLabels: Record<ChangeType, string> = {
  NEW: "新建仓", ADDED: "增持", REDUCED: "减持", EXIT: "清仓", UNCHANGED: "未变",
};

const changeOrder: ChangeType[] = ["NEW", "ADDED", "REDUCED", "EXIT"];

function compactShares(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function dateLabel(value: string) { return value.replaceAll("-", "."); }
function previousShares(item: Position) { return Math.max(0, item.shares - item.shareChange); }
function signedShares(value: number) { return value === 0 ? "—" : `${value > 0 ? "+" : ""}${compactShares(value)}`; }

export default function ExplorerPage({ view }: { view: "holdings" | "changes" }) {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(portfolioSnapshot);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | ChangeType>(view === "changes" ? "ADDED" : "ALL");
  const [sort, setSort] = useState<"value" | "shares" | "change">(view === "changes" ? "change" : "value");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState("正在连接数据层");

  useEffect(() => {
    let active = true;
    fetch("/api/portfolio").then((response) => response.json()).then((payload) => {
      if (!active || !payload?.data) return;
      setSnapshot(payload.data);
      setStorageStatus(payload.meta?.status === "persistent" ? "持久化快照" : "演示快照");
      const requestedTicker = new URLSearchParams(window.location.search).get("ticker");
      if (requestedTicker) setQuery(requestedTicker);
    }).catch(() => active && setStorageStatus("演示快照"));
    return () => { active = false; };
  }, []);

  const positions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snapshot.positions.filter((item) =>
      (view === "holdings" || item.changeType !== "UNCHANGED") &&
      (filter === "ALL" || item.changeType === filter) &&
      (!normalized || item.ticker.toLowerCase().includes(normalized) || item.issuer.toLowerCase().includes(normalized)))
      .sort((left, right) => {
        if (sort === "shares") return right.shares - left.shares;
        if (sort === "change") return Math.abs(right.shareChange) - Math.abs(left.shareChange);
        return right.value - left.value;
      });
  }, [filter, query, snapshot, sort, view]);

  function exportCsv() {
    const headers = ["ticker", "issuer", "change_type", "previous_report_date", "report_date", "previous_shares", "current_shares", "share_change", "change_percent", "value_usd_billion", "weight_percent"];
    const rows = positions.map((item) => [item.ticker, item.issuer, item.changeType, snapshot.previousReportDate, snapshot.reportDate, previousShares(item), item.shares, item.shareChange, item.changePercent ?? "", item.value, item.weight]);
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `folio-pulse-${view}-${snapshot.reportDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="route-page">
    <SiteHeader active={view} actions={<a className="watch-button route-home-button" href="/">返回概览</a>} />
    <section className="route-hero">
      <div className="route-hero-copy">
        <span className="eyebrow"><span className="live-dot" /> SEC 13F · {storageStatus}</span>
        <p className="section-kicker">{view === "holdings" ? "Portfolio explorer" : "Quarterly activity"}</p>
        <h1>{view === "holdings" ? "完整持仓" : "季度调仓"}</h1>
        <p>{view === "holdings" ? "查看每只股票的披露市值、当前股数和季度变化。" : "聚焦真实发生变化的仓位，快速识别资金流向。"}</p>
      </div>
      <div className="route-period-card">
        <span>比较区间</span><strong>{dateLabel(snapshot.previousReportDate)} → {dateLabel(snapshot.reportDate)}</strong>
        <small>{dateLabel(snapshot.filedAt)} 向 SEC 披露 · {snapshot.manager}</small>
      </div>
    </section>

    <section className="route-content">
      {view === "changes" && <div className="change-summary-grid">{changeOrder.map((type) => <button type="button" key={type} className={filter === type ? `change-summary-card ${type.toLowerCase()} selected` : `change-summary-card ${type.toLowerCase()}`} onClick={() => setFilter(filter === type ? "ALL" : type)}><span>{changeLabels[type]}</span><strong>{snapshot.changes[type]}</strong><small>点击筛选</small></button>)}</div>}

      <div className="explorer-toolbar">
        <label className="route-search"><span>搜索</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="公司名称或股票代码" aria-label="搜索持仓" /></label>
        <label><span>变化类型</span><select value={filter} onChange={(event) => setFilter(event.target.value as "ALL" | ChangeType)}><option value="ALL">全部</option><option value="NEW">新建仓</option><option value="ADDED">增持</option><option value="REDUCED">减持</option><option value="EXIT">清仓</option><option value="UNCHANGED">未变</option></select></label>
        <label><span>排序方式</span><select value={sort} onChange={(event) => setSort(event.target.value as "value" | "shares" | "change")}><option value="value">当前市值</option><option value="shares">本季持仓量</option><option value="change">变化量绝对值</option></select></label>
        <button className="export-button" type="button" onClick={exportCsv} disabled={positions.length === 0}>导出 CSV</button>
        <div className="explorer-count"><strong>{positions.length}</strong><span>个结果</span></div>
      </div>

      <div className="position-card-grid">{positions.map((item) => {
        const isExpanded = expanded === item.ticker;
        return <article className={isExpanded ? "position-card expanded" : "position-card"} key={`${item.ticker}-${item.changeType}`}>
          <button className="position-card-main" type="button" onClick={() => setExpanded(isExpanded ? null : item.ticker)} aria-expanded={isExpanded}>
            <span className="ticker-badge">{item.ticker.slice(0, 2)}</span>
            <span className="position-identity"><strong>{item.ticker}</strong><small>{item.issuer}</small></span>
            <span className={`change-tag ${item.changeType.toLowerCase()}`}>{changeLabels[item.changeType]}</span>
            <span className="position-card-value"><strong>{item.value === 0 ? "—" : `$${item.value.toFixed(2)}B`}</strong><small>{item.weight ? `${item.weight.toFixed(2)}%` : "已退出组合"}</small></span>
            <span className="card-expand">{isExpanded ? "−" : "+"}</span>
          </button>
          {isExpanded && <div className="position-card-detail">
            <div><span>上季持仓</span><strong>{compactShares(previousShares(item))}</strong><small>{dateLabel(snapshot.previousReportDate)}</small></div>
            <div className={item.shareChange > 0 ? "gain" : item.shareChange < 0 ? "loss" : ""}><span>股份变化</span><strong>{signedShares(item.shareChange)}</strong><small>{item.changePercent === null ? changeLabels[item.changeType] : `${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`}</small></div>
            <div><span>本季持仓</span><strong>{compactShares(item.shares)}</strong><small>{dateLabel(snapshot.reportDate)}</small></div>
            <div className="position-detail-links"><a href={`/holding/${encodeURIComponent(item.ticker)}`}>打开独立详情页 →</a><a href={`/?ticker=${encodeURIComponent(item.ticker)}#holdings`}>仪表盘定位 ↗</a></div>
          </div>}
        </article>;
      })}</div>
      {positions.length === 0 && <div className="route-empty">没有符合当前条件的持仓。<button type="button" onClick={() => { setQuery(""); setFilter("ALL"); }}>清除筛选</button></div>}
    </section>
    <footer><span>FolioPulse · {view === "holdings" ? "完整持仓档案" : "季度资金动作"}</span><span><a href="/methodology">了解数据口径 →</a></span></footer>
  </main>;
}
