/* eslint-disable @next/next/no-html-link-for-pages -- full-page navigation avoids a deployed Sites client-router stall */
import type { Metadata } from "next";
import { ArrowLeft, DatabaseZap } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import ManagerDirectory from "./ManagerDirectory";

const title = "投资人中心｜FolioPulse";
const description = "搜索、关注并查看知名投资机构的 SEC 13F 持仓档案与数据接入状态。";

export const metadata: Metadata = { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };

export default function ManagersPage() {
  return <main className="route-page managers-page">
    <SiteHeader active="managers" actions={<a className="watch-button route-home-button" href="/"><ArrowLeft aria-hidden="true" size={15} />返回概览</a>} />
    <section className="manager-directory-hero"><div><span className="eyebrow"><DatabaseZap aria-hidden="true" size={14} /> Investor network</span><p className="section-kicker">机构档案库</p><h1>投资人中心</h1><p>八家机构，同一个清晰界面。搜索策略、关注投资人，并查看真实季度持仓变化。</p></div><aside><strong>8 / 8</strong><span>真实数据已接入</span><small>全部机构均使用 SEC 原始申报；桥水、Appaloosa 与 Duquesne 已更新至 2026 年第二季度。</small></aside></section>
    <section className="manager-directory-content"><ManagerDirectory /></section>
    <footer><span>FolioPulse · 投资人档案网络</span><span>关注状态仅保存在当前设备</span></footer>
  </main>;
}
