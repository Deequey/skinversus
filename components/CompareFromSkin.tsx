"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Swords } from "lucide-react";
import type { Skin } from "@/lib/types";
import { SkinSearch } from "@/components/SkinSearch";

export function CompareFromSkin({ skin }: { skin: Skin }) {
  const router = useRouter();
  const [opponent, setOpponent] = useState<Skin | null>(null);
  const ready = Boolean(opponent && opponent.id !== skin.id);

  return (
    <div className="glass-panel rounded-[32px] p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/8 bg-white/[.04] text-violet-300"><Swords size={18} /></div>
        <div><h2 className="text-lg font-semibold tracking-tight text-white">Put it head-to-head</h2><p className="mt-1 text-sm text-zinc-600">Pick any opponent and see what the community chooses.</p></div>
      </div>
      <SkinSearch label="Compare against" value={opponent} onChange={setOpponent} />
      {opponent?.id === skin.id ? <p className="mt-3 text-xs text-rose-300">Pick a different skin.</p> : null}
      <button type="button" disabled={!ready} onClick={() => ready && opponent && router.push(`/compare/${skin.slug}/vs/${opponent.slug}`)} className="primary-button group mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-25">
        Compare now <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
