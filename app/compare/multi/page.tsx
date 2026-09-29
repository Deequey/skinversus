import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Layers3 } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { getRankedSkinsBySlugs } from "@/lib/data";
import type { RankedSkin } from "@/lib/types";
import { approvalPct, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ skins?: string | string[] }> };

function formatFloat(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  return `${min?.toFixed(4) ?? "—"} – ${max?.toFixed(4) ?? "—"}`;
}

export default async function MultiComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.skins) ? params.skins.join(",") : params.skins ?? "";
  const slugs = [...new Set(raw.split(",").map((slug) => slug.trim()).filter(Boolean))].slice(0, 4);
  const skins = await getRankedSkinsBySlugs(slugs);

  if (skins.length < 2) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-5 py-20">
        <div className="glass-panel w-full rounded-[36px] p-10 text-center">
          <Layers3 className="mx-auto text-zinc-600" size={28} />
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.045em] text-white">Choose at least two skins.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500">Add between two and four skins on the homepage to compare them side by side.</p>
          <Link href="/#multi-compare" className="primary-button mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold"><ArrowLeft size={16} /> Choose skins</Link>
        </div>
      </main>
    );
  }

  const rows: Array<{ label: string; value: (skin: RankedSkin) => ReactNode }> = [
    { label: "Community score", value: (skin) => <strong className="text-white">{Number(skin.community_score ?? 50).toFixed(0)}<span className="font-normal text-zinc-700">/100</span></strong> },
    { label: "Approval", value: (skin) => `${approvalPct(Number(skin.likes ?? 0), Number(skin.dislikes ?? 0))}%` },
    { label: "Upvotes", value: (skin) => Number(skin.likes ?? 0).toLocaleString() },
    { label: "Downvotes", value: (skin) => Number(skin.dislikes ?? 0).toLocaleString() },
    { label: "Battle record", value: (skin) => `${Number(skin.battle_wins ?? 0).toLocaleString()} / ${Number(skin.battle_votes ?? 0).toLocaleString()}` },
    { label: "Tracked price", value: (skin) => formatPrice(skin.price_usd) },
    { label: "Weapon", value: (skin) => skin.weapon_name ?? "—" },
    { label: "Finish", value: (skin) => skin.finish_name ?? "—" },
    { label: "Rarity", value: (skin) => skin.rarity_name ?? "—" },
    { label: "Float range", value: (skin) => formatFloat(skin.min_float, skin.max_float) },
    { label: "StatTrak", value: (skin) => skin.stattrak ? "Available" : "No" },
    { label: "Souvenir", value: (skin) => skin.souvenir ? "Available" : "No" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:pt-16">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/#multi-compare" className="interactive inline-flex items-center gap-2 text-xs font-medium text-zinc-600 transition hover:text-white"><ArrowLeft size={14} /> Change shortlist</Link>
          <div className="eyebrow mt-8">Multi compare</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.055em] text-white md:text-6xl">Your shortlist, side by side.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">No forced winner and no VS vote. Use the data and community signal to narrow down your choice.</p>
        </div>
        <ShareButton title="My SkinVersus shortlist" />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {skins.map((skin) => (
          <Link key={skin.id} href={`/skins/${skin.slug}`} className="feature-card group min-w-0 overflow-hidden rounded-[28px] border border-white/8 bg-white/[.022] p-3 md:p-4">
            <div className="relative grid h-32 place-items-center overflow-hidden rounded-[22px] bg-black/20 md:h-44" style={{ background: `radial-gradient(circle at 50% 45%, ${skin.rarity_color ?? "#6ea8ff"}1f, transparent 64%)` }}>
              {skin.image_url ? <img src={skin.image_url} alt={skin.name} className="max-h-24 max-w-[92%] object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,.52)] transition duration-500 group-hover:scale-[1.04] md:max-h-32" /> : null}
            </div>
            <div className="mt-4 flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">{skin.weapon_name ?? skin.category}</div><div className="mt-1 truncate text-sm font-semibold text-white md:text-base">{skin.finish_name ?? skin.name}</div></div><ArrowUpRight size={15} className="mt-1 shrink-0 text-zinc-700 transition group-hover:text-white" /></div>
          </Link>
        ))}
      </div>

      <div className="glass-panel overflow-hidden rounded-[32px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-white/[.022]">
                <th className="w-[170px] border-b border-white/[.06] p-5 text-left text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-700">Signal</th>
                {skins.map((skin) => <th key={skin.id} className="border-b border-l border-white/[.06] p-5 text-left text-xs font-semibold text-zinc-300">{skin.finish_name ?? skin.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="transition hover:bg-white/[.018]">
                  <td className="border-b border-white/[.055] p-5 text-xs font-medium text-zinc-600">{row.label}</td>
                  {skins.map((skin) => <td key={`${row.label}-${skin.id}`} className="border-b border-l border-white/[.055] p-5 text-sm text-zinc-300">{row.value(skin)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-5 text-center text-[10px] text-zinc-700">Community scores change as more people vote. Tracked price is shown only when a price source has been connected.</p>
    </main>
  );
}
