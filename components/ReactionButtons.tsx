"use client";

import { useEffect, useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { approvalPct } from "@/lib/utils";

function voterToken() {
  const key = "skinversus-voter-token";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function ReactionButtons({ slug, likes, dislikes }: { slug: string; likes: number; dislikes: number }) {
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<1 | -1 | null>(null);
  const [localLikes, setLocalLikes] = useState(likes);
  const [localDislikes, setLocalDislikes] = useState(dislikes);

  useEffect(() => {
    const raw = localStorage.getItem(`skinversus-reaction-${slug}`);
    if (raw === "1" || raw === "-1") setChoice(Number(raw) as 1 | -1);
  }, [slug]);

  useEffect(() => { setLocalLikes(likes); setLocalDislikes(dislikes); }, [likes, dislikes]);

  const approval = useMemo(() => approvalPct(localLikes, localDislikes), [localLikes, localDislikes]);

  async function react(reaction: 1 | -1) {
    if (busy) return;
    const previous = choice;

    if (previous !== reaction) {
      if (previous === 1) setLocalLikes((v) => Math.max(0, v - 1));
      if (previous === -1) setLocalDislikes((v) => Math.max(0, v - 1));
      if (reaction === 1) setLocalLikes((v) => v + 1);
      if (reaction === -1) setLocalDislikes((v) => v + 1);
      setChoice(reaction);
    }

    setBusy(true);
    const res = await fetch(`/api/skins/${slug}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction, voterToken: voterToken() }),
    });
    setBusy(false);

    if (res.ok) {
      localStorage.setItem(`skinversus-reaction-${slug}`, String(reaction));
    } else {
      setChoice(previous);
      setLocalLikes(likes);
      setLocalDislikes(dislikes);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-600">Community approval</div><div className="mt-1 text-sm text-zinc-400">Would you own this skin?</div></div>
        <div className="text-right"><div className="text-2xl font-semibold tracking-tight text-white">{approval}%</div><div className="text-[9px] uppercase tracking-[.18em] text-zinc-700">positive</div></div>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-rose-400/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-500" style={{ width: `${approval}%` }} /></div>
      <div className="grid grid-cols-2 gap-3">
        <button disabled={busy} onClick={() => react(1)} className={`interactive flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${choice === 1 ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-200" : "border-white/8 bg-white/[.025] text-zinc-400 hover:bg-white/[.055] hover:text-white"}`}>
          <ThumbsUp size={17} /> Upvote <span className="text-xs opacity-60">{localLikes.toLocaleString()}</span>
        </button>
        <button disabled={busy} onClick={() => react(-1)} className={`interactive flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${choice === -1 ? "border-rose-300/30 bg-rose-300/10 text-rose-200" : "border-white/8 bg-white/[.025] text-zinc-400 hover:bg-white/[.055] hover:text-white"}`}>
          <ThumbsDown size={17} /> Downvote <span className="text-xs opacity-60">{localDislikes.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}
