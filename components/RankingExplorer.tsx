"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Trophy } from "lucide-react";
import type { RankedSkin } from "@/lib/types";
import { approvalPct } from "@/lib/utils";

const groups = ["All", "Knives", "Rifles", "Pistols", "Snipers", "Gloves"] as const;

function groupFor(skin: RankedSkin) {
  const text = `${skin.weapon_name ?? ""} ${skin.category ?? ""}`.toLowerCase();
  if (/knife|bayonet|karambit|dagger|falchion|kukri/.test(text)) return "Knives";
  if (/glove|wrap/.test(text)) return "Gloves";
  if (/awp|ssg|scar|g3sg/.test(text)) return "Snipers";
  if (/glock|usp|p2000|p250|tec|five|cz75|deagle|desert eagle|revolver|dual/.test(text)) return "Pistols";
  if (/ak|m4|famas|galil|aug|sg 553/.test(text)) return "Rifles";
  return "Other";
}

export function RankingExplorer({ skins }: { skins: RankedSkin[] }) {
  const [group, setGroup] = useState<(typeof groups)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skins.filter((skin) => {
      const matchesGroup = group === "All" || groupFor(skin) === group;
      const matchesQuery = !q || `${skin.name} ${skin.weapon_name ?? ""} ${skin.finish_name ?? ""}`.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [skins, group, query]);

  return (
    <>
      <div className="glass-panel mb-5 flex flex-col gap-4 rounded-[28px] p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {groups.map((item) => <button key={item} onClick={() => setGroup(item)} className={`interactive rounded-full px-4 py-2 text-xs font-semibold transition ${group === item ? "bg-white text-black" : "border border-white/8 bg-white/[.025] text-zinc-500 hover:text-white"}`}>{item}</button>)}
        </div>
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-white/8 bg-black/15 px-4 md:w-64"><Search size={14} className="text-zinc-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ranking…" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-700" /></label>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white/8 bg-white/[.018] shadow-[0_35px_100px_rgba(0,0,0,.24)]">
        {filtered.length ? filtered.map((skin, index) => {
          const approval = approvalPct(Number(skin.likes ?? 0), Number(skin.dislikes ?? 0));
          return (
            <Link key={skin.id} href={`/skins/${skin.slug}`} className="ranking-row group grid grid-cols-[44px_64px_1fr_auto] items-center gap-3 border-b border-white/[.055] px-4 py-3.5 last:border-0 md:grid-cols-[60px_72px_1fr_130px_110px_100px] md:px-5">
              <div className="text-center text-sm font-semibold text-zinc-700">#{index + 1}</div>
              <div className="grid size-14 place-items-center rounded-2xl border border-white/[.035] bg-black/20">{skin.image_url ? <img src={skin.image_url} alt="" className="max-h-11 max-w-14 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.45)] transition duration-500 group-hover:scale-105" /> : null}</div>
              <div className="min-w-0"><div className="truncate font-semibold text-white">{skin.name}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-600"><span>{skin.weapon_name}</span>{skin.rarity_name ? <><span>•</span><span>{skin.rarity_name}</span></> : null}</div></div>
              <div className="hidden text-right md:block"><div className="text-sm font-semibold text-zinc-300">{skin.battle_wins ?? 0}/{skin.battle_votes ?? 0}</div><div className="text-[9px] uppercase tracking-[.15em] text-zinc-700">battle wins</div></div>
              <div className="hidden text-right md:block"><div className="text-sm font-semibold text-zinc-300">{approval}%</div><div className="text-[9px] uppercase tracking-[.15em] text-zinc-700">approval</div></div>
              <div className="text-right"><div className="inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight text-white"><Trophy size={14} className="text-amber-300" />{Number(skin.community_score ?? 50).toFixed(0)}</div><div className="text-[9px] uppercase tracking-[.15em] text-zinc-700">score</div></div>
            </Link>
          );
        }) : <div className="p-10 text-center text-sm text-zinc-600">No skins match these filters.</div>}
      </div>
    </>
  );
}
