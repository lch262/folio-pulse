/* eslint-disable @next/next/no-html-link-for-pages -- full-page navigation avoids a deployed Sites client-router stall */
import type { ReactNode } from "react";
import { Activity, ArrowLeftRight, ChartNoAxesColumnIncreasing, CircleHelp, LayoutDashboard, UsersRound, type LucideIcon } from "lucide-react";

type ActivePage = "overview" | "managers" | "holdings" | "changes" | "methodology";

const navItems: Array<{ key: ActivePage; label: string; href: string; icon: LucideIcon }> = [
  { key: "overview", label: "概览", href: "/", icon: LayoutDashboard },
  { key: "managers", label: "投资人", href: "/managers", icon: UsersRound },
  { key: "holdings", label: "完整持仓", href: "/holdings", icon: ChartNoAxesColumnIncreasing },
  { key: "changes", label: "季度调仓", href: "/changes", icon: ArrowLeftRight },
  { key: "methodology", label: "数据说明", href: "/methodology", icon: CircleHelp },
];

export default function SiteHeader({ active, actions }: { active: ActivePage; actions?: ReactNode }) {
  const links = navItems.map((item) => (
    <a key={item.key} className={active === item.key ? "active" : ""} href={item.href} aria-current={active === item.key ? "page" : undefined}><item.icon aria-hidden="true" size={16} strokeWidth={1.8} /><span>{item.label}</span></a>
  ));

  return <>
    <header className="site-header">
      <a className="brand" href="/" aria-label="FolioPulse 首页">
        <span className="brand-mark"><Activity aria-hidden="true" size={19} strokeWidth={1.9} /></span>
        <span>Folio<span>Pulse</span></span>
      </a>
      <nav aria-label="主导航">{links}</nav>
      <div className="header-actions">{actions}</div>
    </header>
    <nav className="mobile-route-nav" aria-label="移动端主导航">{links}</nav>
  </>;
}
