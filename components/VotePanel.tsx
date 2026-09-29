"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Trophy } from "lucide-react";
import { pct } from "@/lib/utils";

function voterToken() {
  const key = "skinversus-voter-token";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function VotePanel({ comparisonId, leftId, rightId, leftName, rightName, totalVotes, leftVotes, rightVotes }: {
  comparisonId: string; leftId: string; rightId: string; leftName: string; rightName: string;
  totalVotes: number; leftVotes: number; rightVotes: number;
}) {
  const [busy, setBusy] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: totalVotes, left: leftVotes, right: rightVotes });

  useEffect(() => {
    setVotedFor(localStorage.getItem(`skinversus-voted-${comparisonId}`));
    setCounts({ total: totalVotes, left: leftVotes, right: rightVotes });
  }, [comparisonId, totalVotes, leftVotes, rightVotes]);

  const leftPct = useMemo(() => pct(counts.left, counts.total), [counts]);
  const rightPct = counts.total ? 100 - leftPct : 50;

  async function vote(winnerSkinId: string) {
    if (busy) return;
    const previous = votedFor;
    if (previous !== winnerSkinId) {
      setCounts((current) => {
        let next = { ...current };
        if (!previous) next.total += 1;
        if (previous === leftId) next.left = Math.max(0, next.left - 1);
        if (previous === rightId) next.right = Math.max(0, next.right - 1);
        if (winnerSkinId === leftId) next.left += 1;
        if (winnerSkinId === rightId) next.right += 1;
        return next;
      });
      setVotedFor(winnerSkinId);
    }

    setBusy(true);
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comparisonId, winnerSkinId, voterToken: voterToken() }),
    });
    setBusy(false);

    if (res.ok) localStorage.setItem(`skinversus-voted-${comparisonId}`, winnerSkinId);
    else {
      setVotedFor(previous);
      setCounts({ total: totalVotes, left: leftVotes, right: rightVotes });
    }
  }

  return (
    <section className="glass-panel overflow-hidden rounded-[34px] p-5 md:p-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><div className="eyebrow">Community battle</div><h3 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white md:text-3xl">Which one would you actually buy?</h3></div>
        <div className="shrink-0 text-right"><div className="text-2xl font-semibold tracking-tight text-white">{counts.total.toLocaleString()}</div><div className="text-[9px] uppercase tracking-[.18em] text-zinc-700">votes</div></div>
      </div>

      <div className="mb-5 flex h-2 overflow-hidden rounded-full bg-white/5">
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-700" style={{ width: `${leftPct}%` }} />
        <div className="bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-700" style={{ width: `${rightPct}%` }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          [leftId, leftName, leftPct, "cyan"],
          [rightId, rightName, rightPct, "violet"],
        ].map(([id, name, percent, tone]: any) => {
          const selected = votedFor === id;
          return (
            <button key={id} disabled={busy} onClick={() => vote(id)} className={`interactive group rounded-[24px] border p-5 text-left transition duration-300 disabled:opacity-60 ${selected ? tone === "cyan" ? "border-cyan-300/25 bg-cyan-300/[.075]" : "border-violet-300/25 bg-violet-300/[.075]" : "border-white/8 bg-white/[.025] hover:border-white/15 hover:bg-white/[.05]"}`}>
              <div className="flex items-center justify-between gap-4"><span className="truncate font-semibold text-white">{name}</span><span className="text-3xl font-semibold tracking-[-.04em] text-white">{percent}%</span></div>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">{selected ? <Check size={14} className="text-emerald-300" /> : <Trophy size={14} />} {selected ? "Your current pick" : "Vote for this skin"}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
