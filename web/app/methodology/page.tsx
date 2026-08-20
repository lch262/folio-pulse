import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";

const title = "数据说明｜FolioPulse";
const description = "了解 FolioPulse 如何读取 SEC 13F、比较季度持仓并解释数据时效。";

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

const steps = [
  ["01", "读取 SEC 原始申报", "直接读取 EDGAR 中的 13F-HR 与 Information Table，不依赖二手新闻摘要。"],
  ["02", "标准化证券记录", "按 CUSIP、证券类型与股票数量合并同一标的，减少管理人拆分行造成的误差。"],
  ["03", "比较相邻报告期", "以上季持仓量和本季持仓量为准，分类为新建、增持、减持、未变或清仓。"],
  ["04", "生成可交互视图", "将报告期、提交日期、持仓股数、市值和变化百分比写入持久化数据库。"],
];

export default function MethodologyPage() {
  return <main className="route-page">
    <SiteHeader active="methodology" actions={<Link className="watch-button route-home-button" href="/">返回概览</Link>} />
    <section className="route-hero method-hero"><div className="route-hero-copy"><p className="section-kicker">Methodology</p><h1>数据说明</h1><p>知道每一个数字从哪里来，也知道它不能说明什么。</p></div><aside className="method-warning"><strong>13F 不是实时持仓</strong><p>机构可在季度结束后 45 天内提交，期间可能已经再次交易。它适合研究组合结构和长期变化，不适合作为实时跟单信号。</p></aside></section>
    <section className="method-route-content">
      <div className="method-step-list">{steps.map(([number, heading, copy]) => <article key={number}><span>{number}</span><div><h2>{heading}</h2><p>{copy}</p></div></article>)}</div>
      <aside className="date-guide"><span className="section-kicker">日期怎么读</span><h2>报告期与提交日不同</h2><dl><div><dt>报告期</dt><dd>持仓数据对应的季度末日期，例如 2026.06.30。</dd></div><div><dt>上一报告期</dt><dd>用于比较持仓变化的前一个季度末，例如 2026.03.31。</dd></div><div><dt>提交日期</dt><dd>机构把 13F 文件递交给 SEC 的日期，例如 2026.08.14。</dd></div></dl><div className="method-links"><Link href="/holdings">查看完整持仓 →</Link><Link href="/changes">查看季度调仓 →</Link></div></aside>
    </section>
    <footer><span>FolioPulse · 数据透明优先</span><span>页面仅用于研究，不构成投资建议</span></footer>
  </main>;
}
