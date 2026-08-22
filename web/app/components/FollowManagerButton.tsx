"use client";

import { useEffect, useState } from "react";
import { Check, Heart } from "lucide-react";

const storageKey = "folio-pulse-followed-managers";

function readFollowed() {
  try { return new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
  catch { return new Set<string>(); }
}

export default function FollowManagerButton({ slug }: { slug: string }) {
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFollowed(readFollowed().has(slug)), 0);
    return () => window.clearTimeout(timer);
  }, [slug]);

  function toggle() {
    const values = readFollowed();
    if (values.has(slug)) values.delete(slug); else values.add(slug);
    localStorage.setItem(storageKey, JSON.stringify([...values]));
    setFollowed(values.has(slug));
  }

  return <button className={followed ? "watch-button followed" : "watch-button"} type="button" aria-pressed={followed} onClick={toggle}>{followed ? <Check aria-hidden="true" size={15} /> : <Heart aria-hidden="true" size={15} />}{followed ? "已关注" : "关注机构"}</button>;
}
