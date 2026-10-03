"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Skin } from "@/lib/types";
import { SkinSearch } from "@/components/SkinSearch";

export function SkinFinder() {
  const router = useRouter();
  const [skin, setSkin] = useState<Skin | null>(null);

  return (
    <div className="glass-panel rounded-[34px] p-4 md:p-6">
      <SkinSearch label="Find a skin" value={skin} onChange={setSkin} />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-zinc-400"><ThumbsUp size={14} /><ThumbsDown size={14} /><span>No account needed to vote.</span></div>
        <button type="button" disabled={!skin} onClick={() => skin && router.push(`/skins/${skin.slug}`)} className="primary-button group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-25">
          Open community page <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
