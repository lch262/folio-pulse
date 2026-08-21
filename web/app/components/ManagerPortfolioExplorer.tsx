"use client";

import { useMemo, useState } from "react";
import type { ChangeType, PortfolioSnapshot } from "../lib/portfolio-data";

type Filter = "CURRENT" | ChangeType;

const filters: { value: Filter; label: string }[] = [
  { value: "CURRENT", label: "当前持仓" },
  { value: "NEW", label: "新建" },
  { value: "ADDED", label: "增持" },
  { value: "REDUCED", label: "减持" },
  { value: "EXIT", label: "清仓" },
];

const labels: Record<ChangeType, string> = {
  NEW: "新建仓", ADDED: "增持", REDUCED: "减持", EXIT: "清仓", UNCHANGED: "未变化",
};

function compactShares(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

export default function ManagerPortfolioExplorer({ snapshot, managerSlug }: { snapshot: PortfolioSnapshot; managerSlug: string }) {
  const [filter, setFilter] = useState<Filter>("CURRENT");
  const [query, setQuery] = useState("");
  const positions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snapshot.positions.filter((item) =>
      (filter === "CURRENT" ? item.changeType !== "EXIT" : item.changeType === filter) &&
      (!normalized || `${item.ticker} ${item.issuer}`.toLowerCase().includes(normalized)));
  }, [filter, query, snapshot.positions]);

  return <section className="manager-portfolio-explorer" id="manager-holdings">
    <div className="manager-panel-heading"><div><span className="section-kicker">Portfolio explorer</span><h2>持仓与季度动作</h2></div><span>{snapshot.previousReportDate} → {snapshot.reportDate}</span></div>
    <div className="manager-portfolio-toolbar">
      <label><span>搜索代码或公司</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：PLTR、NVIDIA" /></label>
      <div role="group" aria-label="持仓变化筛选">{filters.map((item) => <button type="button" key={item.value} className={filter === item.value ? "selected" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
    </div>
    <div className="manager-portfolio-list">
      {positions.map((item) => <a href={`/holding/${encodeURIComponent(item.ticker)}?manager=${encodeURIComponent(managerSlug)}`} key={item.ticker}>
        <span className={`change-tag ${item.changeType.toLowerCase()}`}>{labels[item.changeType]}</span>
        <div><strong>{item.ticker}</strong><small>{item.issuer}</small></div>
        <em>{item.changeType === "EXIT" ? "已清仓" : `${item.weight.toFixed(2)}%`}</em>
        <span className={item.shareChange > 0 ? "positive" : item.shareChange < 0 ? "negative" : ""}>{item.shareChange > 0 ? "+" : ""}{compactShares(item.shareChange)}</span>
        <b>查看 →</b>
      </a>)}
      {positions.length === 0 && <p className="manager-portfolio-empty">没有符合当前条件的持仓。</p>}
    </div>
  </section>;
}
