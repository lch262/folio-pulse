import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import ShareButton from "../../components/ShareButton";
import { portfolioSnapshot, type ChangeType, type Position } from "../../lib/portfolio-data";

const changeLabels: Record<ChangeType, string> = {
  NEW: "新建仓", ADDED: "增持", REDUCED: "减持", EXIT: "清仓", UNCHANGED: "持仓未变",
};

function findPosition(snapshot: typeof portfolioSnapshot, ticker: string) {
  return snapshot.positions.find((item) => item.ticker.toLowerCase() === ticker.toLowerCase());
}

function compactShares(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function dateLabel(value: string) { return value.replaceAll("-", "."); }
function previousShares(item: Position) { return Math.max(0, item.shares - item.shareChange); }
function signedShares(value: number) { return value === 0 ? "—" : `${value > 0 ? "+" : ""}${compactShares(value)}`; }

function explanation(item: Position, snapshot: PortfolioSnapshot) {
  const action = changeLabels[item.changeType];
  if (item.changeType === "NEW") return `${snapshot.managerShort} 在本报告期首次披露持有 ${item.issuer}，期末持仓为 ${compactShares(item.shares)}股。`;
  if (item.changeType === "EXIT") return `${snapshot.managerShort} 已在本报告期清空上一季度披露的 ${item.issuer} 仓位。`;
  if (item.changeType === "UNCHANGED") return `${snapshot.managerShort} 本季度披露的 ${item.issuer} 持股数量与上季一致。`;
  return `${snapshot.managerShort} 本季度${action} ${item.issuer} ${compactShares(Math.abs(item.shareChange))}股，期末持仓为 ${compactShares(item.shares)}股。`;
}

type PageProps = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker).toUpperCase();
  const snapshot = portfolioSnapshot;
  const position = findPosition(snapshot, ticker);
  if (!position) return { title: "未找到持仓｜FolioPulse", description: "该股票不在当前披露快照中。", openGraph: { title: "未找到持仓｜FolioPulse", description: "该股票不在当前披露快照中。", images: [] }, twitter: { title: "未找到持仓｜FolioPulse", description: "该股票不在当前披露快照中。", images: [] } };
  const title = `${position.ticker} ${changeLabels[position.changeType]}｜FolioPulse`;
  const description = `${position.issuer}：${snapshot.previousReportDate} 至 ${snapshot.reportDate} 的持仓量、变化量与披露市值。`;
  return { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

export default async function HoldingDetailPage({ params }: PageProps) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker).toUpperCase();
  const snapshot = portfolioSnapshot;
  const position = findPosition(snapshot, ticker);
  if (!position) notFound();

  const oldShares = previousShares(position);
  const related = snapshot.positions.filter((item) => item.ticker !== position.ticker && item.sector === position.sector).slice(0, 4);
  const fallbackRelated = related.length ? related : snapshot.positions.filter((item) => item.ticker !== position.ticker).slice(0, 4);

  return <main className="route-page holding-detail-page">
    <SiteHeader active="holdings" actions={<ShareButton />} />
    <section className="holding-detail-hero">
      <div className="holding-breadcrumb"><a href="/holdings">完整持仓</a><span>/</span><strong>{position.ticker}</strong></div>
      <div className="holding-title-row">
        <div className="holding-monogram">{position.ticker.slice(0, 2)}</div>
        <div><span className={`change-tag ${position.changeType.toLowerCase()}`}>{changeLabels[position.changeType]}</span><h1>{position.ticker}</h1><p>{position.issuer} · {position.sector}</p></div>
      </div>
      <p className="holding-lede">{explanation(position, snapshot)}</p>
    </section>

    <section className="holding-detail-content">
      <div className="holding-metric-grid">
        <article><span>当前披露市值</span><strong>{position.value === 0 ? "—" : `$${position.value.toFixed(2)}B`}</strong><small>{dateLabel(snapshot.reportDate)} 期末</small></article>
        <article><span>组合占比</span><strong>{position.weight ? `${position.weight.toFixed(2)}%` : "—"}</strong><small>{snapshot.managerShort}</small></article>
        <article><span>本季持仓量</span><strong>{compactShares(position.shares)}</strong><small>{position.shares.toLocaleString("zh-CN")} 股</small></article>
        <article className={position.shareChange > 0 ? "positive" : position.shareChange < 0 ? "negative" : ""}><span>季度变化量</span><strong>{signedShares(position.shareChange)}</strong><small>{position.changePercent === null ? changeLabels[position.changeType] : `${position.changePercent > 0 ? "+" : ""}${position.changePercent.toFixed(2)}%`}</small></article>
      </div>

      <div className="holding-detail-grid">
        <article className="holding-flow-panel">
          <span className="section-kicker">Share flow</span><h2>持股数量变化</h2>
          <div className="holding-share-flow">
            <div><span>上季持仓</span><strong>{compactShares(oldShares)}</strong><small>{dateLabel(snapshot.previousReportDate)}</small></div>
            <div className={position.shareChange > 0 ? "flow-arrow gain" : position.shareChange < 0 ? "flow-arrow loss" : "flow-arrow"}><strong>{signedShares(position.shareChange)}</strong><span>→</span></div>
            <div><span>本季持仓</span><strong>{compactShares(position.shares)}</strong><small>{dateLabel(snapshot.reportDate)}</small></div>
          </div>
          <p>{explanation(position, snapshot)}</p>
        </article>

        <aside className="holding-filing-panel">
          <span className="section-kicker">Filing context</span><h2>披露信息</h2>
          <dl>
            <div><dt>报告主体</dt><dd>{snapshot.manager}</dd></div>
            <div><dt>比较区间</dt><dd>{snapshot.previousReportDate} → {snapshot.reportDate}</dd></div>
            <div><dt>提交日期</dt><dd>{snapshot.filedAt}</dd></div>
            <div><dt>文件来源</dt><dd>{snapshot.source} · CIK {snapshot.cik}</dd></div>
          </dl>
          <a href="/methodology">了解 13F 数据口径 →</a>
        </aside>
      </div>

      <section className="related-holdings">
        <div className="related-heading"><div><span className="section-kicker">Continue exploring</span><h2>继续查看持仓</h2></div><a href="/holdings">返回完整持仓 →</a></div>
        <div className="related-holding-grid">{fallbackRelated.map((item) => <a key={item.ticker} href={`/holding/${encodeURIComponent(item.ticker)}`}><span>{item.sector}</span><strong>{item.ticker}</strong><small>{item.issuer}</small><em>{item.weight ? `${item.weight.toFixed(2)}%` : changeLabels[item.changeType]}</em></a>)}</div>
      </section>
    </section>
    <footer><span>FolioPulse · 单股持仓档案</span><span>数据来自 {snapshot.source}，不构成投资建议</span></footer>
  </main>;
}
