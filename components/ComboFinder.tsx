"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SkinSearch } from "@/components/SkinSearch";
import type { Skin } from "@/lib/types";

export function ComboFinder({ initialSkin = null }: { initialSkin?: Skin | null }) {
  const router = useRouter();
  const [skin, setSkin] = useState<Skin | null>(initialSkin);

  return (
    <div className="glass-panel rounded-[32px] p-5 md:p-6">
      <SkinSearch label="Start with a skin you own or want" value={skin} onChange={setSkin} placeholder="Search knife, gloves or any skin…" hint="Try “M9 gamma doppler”" />
      <button type="button" disabled={!skin} onClick={() => skin && router.push(`/combos?skin=${encodeURIComponent(skin.slug)}`)} className="primary-button mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35"><Sparkles size={16}/> Find matching skins</button>
    </div>
  );
}
