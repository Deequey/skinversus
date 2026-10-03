"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, Plus, X } from "lucide-react";
import type { Skin } from "@/lib/types";
import { SkinSearch } from "@/components/SkinSearch";

export function MultiCompareBuilder() {
  const router = useRouter();
  const [slots, setSlots] = useState<(Skin | null)[]>([null, null]);
  const selected = useMemo(() => slots.filter((skin): skin is Skin => Boolean(skin)), [slots]);
  const hasDuplicates = new Set(selected.map((skin) => skin.id)).size !== selected.length;
  const ready = selected.length >= 2 && !hasDuplicates;

  function updateSlot(index: number, skin: Skin | null) {
    setSlots((current) => current.map((item, i) => i === index ? skin : item));
  }

  function addSlot() {
    if (slots.length < 4) setSlots((current) => [...current, null]);
  }

  function removeSlot(index: number) {
    if (slots.length > 2) setSlots((current) => current.filter((_, i) => i !== index));
  }

  function compare() {
    if (!ready) return;
    router.push(`/compare/multi?skins=${encodeURIComponent(selected.map((skin) => skin.slug).join(","))}`);
  }

  return (
    <div className="glass-panel relative overflow-visible rounded-[36px] p-4 md:p-6">
      <div className="panel-shine" />
      <div className={`grid gap-4 ${slots.length > 2 ? "lg:grid-cols-2" : "md:grid-cols-2"}`}>
        {slots.map((skin, index) => (
          <div key={index} className="relative">
            {slots.length > 2 ? (
              <button type="button" onClick={() => removeSlot(index)} className="interactive absolute -right-1 -top-1 z-30 grid size-8 place-items-center rounded-full border border-white/10 bg-[#151922] text-zinc-300 shadow-xl transition hover:text-white" aria-label="Remove slot">
                <X size={13} />
              </button>
            ) : null}
            <SkinSearch label={`Skin ${index + 1}`} value={skin} onChange={(value) => updateSlot(index, value)} />
          </div>
        ))}
      </div>

      {hasDuplicates ? <p className="mt-4 text-center text-xs text-rose-300">Choose different skins for each slot.</p> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={slots.length >= 4} onClick={addSlot} className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-5 text-sm font-semibold text-zinc-200 transition hover:border-blue-300/25 hover:bg-blue-300/[.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
          <Plus size={15} /> Add another skin
        </button>
        <button type="button" disabled={!ready} onClick={compare} className="primary-button group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-25">
          <Layers3 size={16} /> Compare {selected.length || 2} skins <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
