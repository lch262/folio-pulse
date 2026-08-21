/* eslint-disable @next/next/no-html-link-for-pages -- full-page navigation avoids a deployed Sites client-router stall */
import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import ManagerDirectory from "./ManagerDirectory";

const title = "投资人中心｜FolioPulse";
const description = "搜索、关注并查看知名投资机构的 SEC 13F 持仓档案与数据接入状态。";

export const metadata: Metadata = { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };

export default function ManagersPage() {
  return <main className="route-page managers-page">
    <SiteHeader active="managers" actions={<a className="watch-button route-home-button" href="/">返回概览</a>} />
    <section className="manager-directory-hero"><div><span className="eyebrow"><span className="live-dot" /> Investor network</span><p className="section-kicker">机构档案库</p><h1>投资人中心</h1><p>从单一组合走向机构网络。搜索策略、关注投资人，并查看每个数据源的接入状态。</p></div><aside><strong>4 / 8</strong><span>真实数据已接入</span><small>伯克希尔、Scion、ARK 与 H&amp;H 已接入 SEC 原始快照，其余机构将按队列逐步上线。</small></aside></section>
    <section className="manager-directory-content"><ManagerDirectory /></section>
    <footer><span>FolioPulse · 投资人档案网络</span><span>关注状态仅保存在当前设备</span></footer>
  </main>;
}
