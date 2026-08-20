/* eslint-disable @next/next/no-html-link-for-pages -- full-page navigation avoids a deployed Sites client-router stall */
import type { ReactNode } from "react";

type ActivePage = "overview" | "managers" | "holdings" | "changes" | "methodology";

const navItems: Array<{ key: ActivePage; label: string; href: string }> = [
  { key: "overview", label: "概览", href: "/" },
  { key: "managers", label: "投资人", href: "/managers" },
  { key: "holdings", label: "完整持仓", href: "/holdings" },
  { key: "changes", label: "季度调仓", href: "/changes" },
  { key: "methodology", label: "数据说明", href: "/methodology" },
];

export default function SiteHeader({ active, actions }: { active: ActivePage; actions?: ReactNode }) {
  const links = navItems.map((item) => (
    <a key={item.key} className={active === item.key ? "active" : ""} href={item.href} aria-current={active === item.key ? "page" : undefined}>{item.label}</a>
  ));

  return <>
    <header className="site-header">
      <a className="brand" href="/" aria-label="FolioPulse 首页">
        <span className="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.2-6 4.4 12 2.2-6H21" /></svg></span>
        <span>Folio<span>Pulse</span></span>
      </a>
      <nav aria-label="主导航">{links}</nav>
      <div className="header-actions">{actions}</div>
    </header>
    <nav className="mobile-route-nav" aria-label="移动端主导航">{links}</nav>
  </>;
}
