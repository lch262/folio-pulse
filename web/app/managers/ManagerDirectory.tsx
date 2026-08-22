"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Database, Grid2X2, Plus, Search } from "lucide-react";
import ManagerIcon from "../components/ManagerIcon";
import { managerProfiles, type ManagerProfile } from "../lib/managers";

const storageKey = "folio-pulse-followed-managers";

function readFollowed() {
  try { return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
  catch { return new Set<string>(); }
}

function ManagerCard({ manager, followed, onToggle }: { manager: ManagerProfile; followed: boolean; onToggle: () => void }) {
  return <article className={manager.status === "live" ? "manager-card live" : "manager-card"}>
    <a className="manager-card-link" href={`/manager/${manager.slug}`} aria-label={`打开 ${manager.nameZh} 主页`}>
      <div className="manager-card-top"><span className="manager-avatar"><ManagerIcon slug={manager.slug} /><span className="sr-only">{manager.initials}</span></span><span className={`manager-status ${manager.status}`}><Database aria-hidden="true" size={12} />{manager.status === "live" ? "数据已接入" : "即将接入"}</span></div>
      <div className="manager-card-copy"><small>{manager.vehicle}</small><h2>{manager.nameZh}</h2><p>{manager.name}</p><em>{manager.description}</em></div>
      <div className="manager-tags">{manager.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <strong className="manager-card-cta">查看机构主页 →</strong>
    </a>
    <button className={followed ? "manager-follow followed" : "manager-follow"} type="button" aria-pressed={followed} onClick={onToggle}>{followed ? <Check aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />}{followed ? "已关注" : "关注"}</button>
  </article>;
}

export default function ManagerDirectory() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "FOLLOWED">("ALL");
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setFollowed(readFollowed()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleFollow(slug: string) {
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  const managers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return managerProfiles.filter((manager) =>
      (filter !== "LIVE" || manager.status === "live") &&
      (filter !== "FOLLOWED" || followed.has(manager.slug)) &&
      (!normalized || `${manager.name} ${manager.nameZh} ${manager.vehicle} ${manager.tags.join(" ")}`.toLowerCase().includes(normalized)));
  }, [filter, followed, query]);

  return <>
    <div className="manager-toolbar">
      <label><span>搜索投资人或策略</span><div className="manager-search-field"><Search aria-hidden="true" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：伯克希尔、宏观、集中持仓" /></div></label>
      <div className="manager-filter" role="group" aria-label="投资人筛选"><button className={filter === "ALL" ? "selected" : ""} type="button" onClick={() => setFilter("ALL")}><Grid2X2 aria-hidden="true" size={14} />全部</button><button className={filter === "LIVE" ? "selected" : ""} type="button" onClick={() => setFilter("LIVE")}><Database aria-hidden="true" size={14} />已接入</button><button className={filter === "FOLLOWED" ? "selected" : ""} type="button" onClick={() => setFilter("FOLLOWED")}>我的关注 {followed.size}</button></div>
      <span className="manager-result-count">{managers.length} 位投资人</span>
    </div>
    <div className="manager-directory-grid">{managers.map((manager) => <ManagerCard key={manager.slug} manager={manager} followed={followed.has(manager.slug)} onToggle={() => toggleFollow(manager.slug)} />)}</div>
    {managers.length === 0 && <div className="manager-empty">没有符合当前条件的投资人。<button type="button" onClick={() => { setQuery(""); setFilter("ALL"); }}>查看全部</button></div>}
  </>;
}
