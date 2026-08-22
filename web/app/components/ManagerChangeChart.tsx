"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import type { ChangeType, PortfolioSnapshot, Position } from "../lib/portfolio-data";

type Metric = "percent" | "shares";

type ChartPoint = Position & {
  value: number;
  displayValue: string;
};

const labels: Record<ChangeType, string> = {
  NEW: "新建仓",
  ADDED: "增持",
  REDUCED: "减持",
  EXIT: "清仓",
  UNCHANGED: "未变化",
};

const colors: Record<ChangeType, string> = {
  NEW: "#0071e3",
  ADDED: "#34c759",
  REDUCED: "#ff9f0a",
  EXIT: "#ff3b30",
  UNCHANGED: "#86868b",
};

function compactNumber(value: number) {
  const absolute = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  if (absolute >= 100000000) return `${sign}${(absolute / 100000000).toFixed(1)}亿股`;
  if (absolute >= 10000) return `${sign}${(absolute / 10000).toFixed(1)}万股`;
  return `${sign}${absolute.toLocaleString("zh-CN")}股`;
}

function percentageValue(position: Position) {
  if (position.changeType === "NEW") return 100;
  if (position.changeType === "EXIT") return -100;
  return position.changePercent ?? 0;
}

function buildPoints(snapshot: PortfolioSnapshot, metric: Metric): ChartPoint[] {
  return snapshot.positions
    .filter((position) => position.changeType !== "UNCHANGED")
    .map((position) => {
      const value = metric === "percent" ? percentageValue(position) : position.shareChange;
      return {
        ...position,
        value,
        displayValue: metric === "percent"
          ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
          : compactNumber(value),
      };
    })
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 12);
}

function axisLabel(value: number, metric: Metric) {
  if (metric === "percent") return `${Math.round(value)}%`;
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 100000000) return `${sign}${(absolute / 100000000).toFixed(0)}亿`;
  if (absolute >= 10000) return `${sign}${(absolute / 10000).toFixed(0)}万`;
  return `${sign}${absolute.toFixed(0)}`;
}

export default function ManagerChangeChart({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const [metric, setMetric] = useState<Metric>("percent");
  const points = useMemo(() => buildPoints(snapshot, metric), [metric, snapshot]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  if (points.length === 0) return null;

  const selected = points.find((point) => point.ticker === selectedTicker) ?? points[0];
  const width = 960;
  const height = 320;
  const left = 72;
  const right = 28;
  const top = 30;
  const bottom = 72;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxAbsolute = Math.max(...points.map((point) => Math.abs(point.value)), metric === "percent" ? 100 : 1);
  const paddedMax = maxAbsolute * 1.12;
  const x = (index: number) => points.length === 1 ? left + plotWidth / 2 : left + (index * plotWidth) / (points.length - 1);
  const y = (value: number) => top + ((paddedMax - value) / (paddedMax * 2)) * plotHeight;
  const zeroY = y(0);
  const polyline = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const guideValues = [paddedMax, paddedMax / 2, 0, -paddedMax / 2, -paddedMax];

  return <article className="manager-change-chart">
    <div className="manager-chart-heading">
      <div>
        <span className="section-kicker"><ChartNoAxesCombined aria-hidden="true" size={15} /> Quarterly activity</span>
        <h2>季度增减持折线图</h2>
        <p>{snapshot.previousReportDate} → {snapshot.reportDate} · 按绝对变化幅度展示前 {points.length} 项</p>
      </div>
      <div className="chart-metric-tabs" role="group" aria-label="切换折线图指标">
        <button type="button" className={metric === "percent" ? "selected" : ""} onClick={() => { setMetric("percent"); setSelectedTicker(null); }}>变化率</button>
        <button type="button" className={metric === "shares" ? "selected" : ""} onClick={() => { setMetric("shares"); setSelectedTicker(null); }}>股数变化</button>
      </div>
    </div>

    <div className="manager-chart-layout">
      <div className="manager-chart-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`chart-title-${snapshot.cik} chart-description-${snapshot.cik}`}>
          <title id={`chart-title-${snapshot.cik}`}>{snapshot.managerShort}季度增减持折线图</title>
          <desc id={`chart-description-${snapshot.cik}`}>展示从{snapshot.previousReportDate}到{snapshot.reportDate}变化幅度最大的持仓。</desc>
          {guideValues.map((value) => <g key={value}>
            <line className={value === 0 ? "chart-zero-line" : "chart-grid-line"} x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
            <text className="chart-axis-label" x={left - 12} y={y(value) + 4} textAnchor="end">{axisLabel(value, metric)}</text>
          </g>)}
          <polyline className="chart-trend-line" points={polyline} />
          {points.map((point, index) => {
            const isSelected = selected.ticker === point.ticker;
            return <g
              className={isSelected ? "chart-point selected" : "chart-point"}
              key={`${point.ticker}-${point.changeType}`}
              role="button"
              tabIndex={0}
              aria-label={`${point.ticker}，${labels[point.changeType]}，${point.displayValue}`}
              onMouseEnter={() => setSelectedTicker(point.ticker)}
              onFocus={() => setSelectedTicker(point.ticker)}
              onClick={() => setSelectedTicker(point.ticker)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedTicker(point.ticker);
                }
              }}
            >
              <circle className="chart-point-halo" cx={x(index)} cy={y(point.value)} r={isSelected ? 13 : 10} />
              <circle cx={x(index)} cy={y(point.value)} r={isSelected ? 6 : 5} fill={colors[point.changeType]} />
              <text className="chart-ticker-label" x={x(index)} y={height - 35} textAnchor="middle">{point.ticker.length > 9 ? `${point.ticker.slice(0, 7)}…` : point.ticker}</text>
            </g>;
          })}
          <line className="chart-positive-marker" x1={left} x2={left} y1={top} y2={zeroY} />
          <line className="chart-negative-marker" x1={left} x2={left} y1={zeroY} y2={height - bottom} />
        </svg>
      </div>

      <aside className="manager-chart-detail" aria-live="polite">
        <span className={`chart-action-badge ${selected.changeType.toLowerCase()}`}>{labels[selected.changeType]}</span>
        <strong>{selected.ticker}</strong>
        <p>{selected.issuer}</p>
        <div className={selected.value >= 0 ? "chart-detail-value positive" : "chart-detail-value negative"}>
          {selected.value >= 0 ? <ArrowUpRight aria-hidden="true" size={18} /> : <ArrowDownRight aria-hidden="true" size={18} />}
          <span>{selected.displayValue}</span>
        </div>
        <dl>
          <div><dt>当前持仓</dt><dd>{selected.shares.toLocaleString("zh-CN")} 股</dd></div>
          <div><dt>组合权重</dt><dd>{selected.weight.toFixed(2)}%</dd></div>
        </dl>
      </aside>
    </div>

    <div className="manager-chart-legend">
      {(["NEW", "ADDED", "REDUCED", "EXIT"] as ChangeType[]).map((type) => <span key={type}><i style={{ backgroundColor: colors[type] }} />{labels[type]}</span>)}
      <small>{metric === "percent" ? "新建仓与清仓用 +100% / −100% 动作标记呈现。" : "股数变化用于观察申报数量，不代表交易成交金额。"}</small>
    </div>

    <ul className="sr-only">
      {points.map((point) => <li key={`${point.ticker}-summary`}>{point.ticker}：{labels[point.changeType]} {point.displayValue}</li>)}
    </ul>
  </article>;
}
