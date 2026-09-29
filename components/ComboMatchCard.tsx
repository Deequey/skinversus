import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComboMatch } from "@/lib/types";
import { ColorPalette } from "@/components/ColorPalette";

export function ComboMatchCard({ match }: { match: ComboMatch }) {
  const { skin, colors, match_score } = match;
  return (
    <Link href={`/skins/${skin.slug}`} className="feature-card group overflow-hidden rounded-[26px] border border-white/8 bg-white/[.022] p-3.5">
      <div className="relative grid h-36 place-items-center overflow-hidden rounded-[21px] bg-black/20" style={{ background: `radial-gradient(circle at 50% 45%, ${skin.rarity_color ?? "#6ea8ff"}1f, transparent 66%)` }}>
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xl">{match_score}% match</span>
        {skin.image_url ? <img src={skin.image_url} alt={skin.name} className="max-h-24 max-w-[92%] object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,.52)] transition duration-500 group-hover:scale-[1.04]" /> : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[9px] font-semibold uppercase tracking-[.15em] text-zinc-600">{skin.weapon_name ?? skin.category}</div><div className="mt-1 truncate text-sm font-semibold text-white">{skin.finish_name ?? skin.name}</div></div><ArrowUpRight size={15} className="mt-1 shrink-0 text-zinc-700 transition group-hover:text-white"/></div>
      <div className="mt-3 flex items-center justify-between gap-3"><ColorPalette colors={colors} compact/><span className="text-[10px] text-zinc-700">color fit</span></div>
    </Link>
  );
}
