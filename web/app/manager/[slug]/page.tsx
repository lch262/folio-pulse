import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FollowManagerButton from "../../components/FollowManagerButton";
import ManagerPortfolioExplorer from "../../components/ManagerPortfolioExplorer";
import SiteHeader from "../../components/SiteHeader";
import { getManager, managerProfiles } from "../../lib/managers";
import { getPortfolioSnapshotForManager } from "../../lib/portfolio-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const manager = getManager(slug);
  if (!manager) return { title: "未找到投资人｜FolioPulse", description: "该投资人档案不存在。", openGraph: { title: "未找到投资人｜FolioPulse", description: "该投资人档案不存在。", images: [] }, twitter: { title: "未找到投资人｜FolioPulse", description: "该投资人档案不存在。", images: [] } };
  const title = `${manager.nameZh}｜FolioPulse`;
  const description = `${manager.name}：${manager.description}`;
  return { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

function compactShares(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (abs >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

export default async function ManagerPage({ params }: PageProps) {
  const { slug } = await params;
  const manager = getManager(slug);
  if (!manager) notFound();
  const snapshot = getPortfolioSnapshotForManager(slug);
  const isLive = !!snapshot;
  const changes = snapshot?.positions.filter((item) => item.changeType !== "UNCHANGED").slice(0, 5) ?? [];
  const otherManagers = managerProfiles.filter((item) => item.slug !== manager.slug).slice(0, 3);

  return <main className="route-page manager-profile-page">
    <SiteHeader active="managers" actions={<FollowManagerButton slug={manager.slug} />} />
    <section className="manager-profile-hero">
      <div className="manager-profile-breadcrumb"><a href="/managers">投资人中心</a><span>/</span><strong>{manager.nameZh}</strong></div>
      <div className="manager-profile-title"><span className="manager-profile-avatar">{manager.initials}</span><div><span className={`manager-status ${manager.status}`}>{isLive ? "真实数据已接入" : "数据接入中"}</span><p className="section-kicker">{manager.vehicle}</p><h1>{manager.nameZh}</h1><small>{manager.name}</small></div></div>
      <p className="manager-profile-lede">{manager.description}</p>
      <div className="manager-tags manager-profile-tags">{manager.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </section>

    {snapshot ? <section className="manager-live-content">
      <div className="manager-live-metrics"><article><span>最新报告期</span><strong>{snapshot.reportDate}</strong><small>{snapshot.filedAt} 提交</small></article><article><span>披露市值</span><strong>${snapshot.totalValue.toFixed(2)}B</strong><small>SEC 13F-HR</small></article><article><span>持仓数量</span><strong>{snapshot.positionCount}</strong><small>本季披露标的</small></article><article><span>发生变化</span><strong>{snapshot.positionCount - snapshot.changes.UNCHANGED}</strong><small>新建、增持、减持与清仓</small></article></div>
      <div className="manager-live-grid">
        <article className="manager-top-holdings"><div className="manager-panel-heading"><div><span className="section-kicker">Top holdings</span><h2>前五大持仓</h2></div><a href="#manager-holdings">查看全部 →</a></div>{snapshot.positions.filter((item) => item.changeType !== "EXIT").slice(0, 5).map((item, index) => <a href={`/holding/${encodeURIComponent(item.ticker)}?manager=${encodeURIComponent(slug)}`} key={item.ticker}><span>0{index + 1}</span><strong>{item.ticker}</strong><small>{item.issuer}</small><em>{item.weight.toFixed(2)}%</em></a>)}</article>
        <article className="manager-latest-actions"><span className="section-kicker">Latest actions</span><h2>最新资金动作</h2><div>{changes.map((item) => <a href={`/holding/${encodeURIComponent(item.ticker)}?manager=${encodeURIComponent(slug)}`} key={item.ticker}><span className={`change-tag ${item.changeType.toLowerCase()}`}>{item.changeType === "ADDED" ? "增持" : item.changeType === "REDUCED" ? "减持" : item.changeType === "NEW" ? "新建仓" : "清仓"}</span><strong>{item.ticker}</strong><small>{item.shareChange > 0 ? "+" : ""}{compactShares(item.shareChange)}</small></a>)}</div><a className="manager-primary-link" href="#manager-holdings">浏览全部持仓 →</a></article>
      </div>
      <ManagerPortfolioExplorer snapshot={snapshot} managerSlug={slug} />
    </section> : <section className="manager-queued-content">
      <div className="manager-queued-card"><span className="manager-queue-number">01</span><div><p className="section-kicker">Data onboarding</p><h2>原始文件正在排队接入</h2><p>该机构主页已经建立，但还没有展示持仓数字。后续会按“SEC 原始文件 → 相邻季度比较 → 股票代码映射 → 页面校验”的顺序接入，避免用演示数据冒充真实持仓。</p><div className="manager-onboarding-steps"><span className="done">机构档案</span><span>SEC 文件</span><span>季度比较</span><span>页面发布</span></div></div></div>
      <aside><span className="section-kicker">What you can do</span><h2>先加入关注</h2><p>关注状态会保存在当前设备。数据接入后，这里会出现前十大持仓、季度调仓和单股详情入口。</p><FollowManagerButton slug={manager.slug} /></aside>
    </section>}

    <section className="manager-more"><div className="manager-panel-heading"><div><span className="section-kicker">Explore network</span><h2>继续探索投资人</h2></div><a href="/managers">查看全部 →</a></div><div>{otherManagers.map((item) => <a href={`/manager/${item.slug}`} key={item.slug}><span className="manager-avatar">{item.initials}</span><strong>{item.nameZh}</strong><small>{item.vehicle}</small><em>{item.status === "live" ? "数据已接入" : "即将接入"}</em></a>)}</div></section>
    <footer><span>FolioPulse · {manager.nameZh}</span><span>{manager.coverage}</span></footer>
  </main>;
}
