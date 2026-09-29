"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Repeat2 } from "lucide-react";
import type { Skin } from "@/lib/types";
import { SkinSearch } from "./SkinSearch";

export function CompareBuilder() {
  const router = useRouter();
  const [left, setLeft] = useState<Skin | null>(null);
  const [right, setRight] = useState<Skin | null>(null);
  const ready = Boolean(left && right && left.id !== right.id);

  return (
    <div className="glass-panel relative overflow-visible rounded-[38px] p-4 md:p-6">
      <div className="panel-shine" />
      <div className="grid gap-4 md:grid-cols-[1fr_58px_1fr] md:items-end">
        <SkinSearch label="First skin" value={left} onChange={setLeft} />
        <div className="mx-auto hidden size-14 place-items-center rounded-full border border-white/10 bg-black/25 text-[10px] font-black tracking-[.18em] text-zinc-400 shadow-inner md:grid">VS</div>
        <SkinSearch label="Second skin" value={right} onChange={setRight} />
      </div>

      {left && right && left.id === right.id ? <p className="mt-4 text-center text-xs text-rose-300">Choose two different skins.</p> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => { setLeft(right); setRight(left); }} className="interactive inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[.06] hover:text-white">
          <Repeat2 size={15} /> Swap sides
        </button>
        <button type="button" disabled={!ready} onClick={() => ready && left && right && router.push(`/compare/${left.slug}/vs/${right.slug}`)} className="primary-button group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-25">
          Compare skins <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
