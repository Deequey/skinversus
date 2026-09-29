import Link from "next/link";
import type { Skin } from "@/lib/types";

export function SkinVisual({ skin, score }: { skin: Skin; score?: number | null }) {
  return (
    <div className="text-center">
      <Link href={`/skins/${skin.slug}`} className="group block">
        <div className="relative mx-auto grid h-72 place-items-center overflow-hidden rounded-[36px] border border-white/8 bg-white/[.022] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_28px_90px_rgba(0,0,0,.2)] transition duration-500 group-hover:-translate-y-1 group-hover:border-white/14 group-hover:bg-white/[.035] md:h-80">
          <div className="absolute inset-x-10 top-4 h-32 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: skin.rarity_color ?? "#6ea8ff" }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,.055),transparent_46%)]" />
          {score != null ? <div className="absolute left-4 top-4 rounded-full border border-white/8 bg-black/25 px-3 py-1.5 text-[10px] font-semibold text-zinc-400 backdrop-blur-xl"><span className="text-white">{Number(score).toFixed(0)}</span>/100 score</div> : null}
          {skin.image_url ? <img src={skin.image_url} alt={skin.name} className="relative max-h-52 max-w-full object-contain drop-shadow-[0_30px_38px_rgba(0,0,0,.58)] transition duration-700 group-hover:scale-[1.04] md:max-h-60" /> : <span className="text-zinc-700">No image</span>}
        </div>
        <div className="mt-6 text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-600">{skin.weapon_name ?? skin.category}</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white transition group-hover:text-zinc-200 md:text-3xl">{skin.finish_name ?? skin.name}</h2>
        <div className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-600">{skin.rarity_color ? <span className="size-1.5 rounded-full" style={{ background: skin.rarity_color }} /> : null}{skin.rarity_name ?? "CS2 skin"}</div>
      </Link>
    </div>
  );
}
