import Link from "next/link";
import { ArrowLeft, Palette, Sparkles } from "lucide-react";
import { ComboFinder } from "@/components/ComboFinder";
import { ComboMatchCard } from "@/components/ComboMatchCard";
import { ColorPalette } from "@/components/ColorPalette";
import { getComboMatchesForSkin, getSkinBySlug, getSkinColors } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ skin?: string | string[] }> };

export default async function CombosPage({ searchParams }: Props) {
  const params = await searchParams;
  const slug = Array.isArray(params.skin) ? params.skin[0] : params.skin;
  const skin = slug ? await getSkinBySlug(slug) : null;
  const [colors, matches] = skin
    ? await Promise.all([getSkinColors(skin.id), getComboMatchesForSkin(skin, 12)])
    : [[], []];

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-12 md:pt-16">
      <div className="mx-auto max-w-4xl text-center">
        <div className="eyebrow">Color matching</div>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-.055em] text-white md:text-6xl">Build a combo around a skin.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-500">SkinVersus compares dominant palettes and ranks visually compatible knives and gloves. It is a color-fit score, not a price or investment recommendation.</p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><ComboFinder initialSkin={skin} /></div>

      {skin ? (
        <section className="mt-16">
          <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-stretch">
            <div className="glass-panel rounded-[30px] p-5">
              <Link href={`/skins/${skin.slug}`} className="interactive inline-flex items-center gap-2 text-xs text-zinc-600 transition hover:text-white"><ArrowLeft size={13}/> Skin page</Link>
              <div className="mt-5 grid min-h-52 place-items-center rounded-[24px] border border-white/[.055] bg-black/20 p-5" style={{ background: `radial-gradient(circle, ${skin.rarity_color ?? "#6ea8ff"}18, transparent 68%)` }}>
                {skin.image_url ? <img src={skin.image_url} alt={skin.name} className="max-h-36 max-w-[92%] object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]"/> : null}
              </div>
              <div className="mt-5 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">{skin.weapon_name ?? skin.category}</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-white">{skin.finish_name ?? skin.name}</h2>
              <div className="mt-4"><ColorPalette colors={colors} compact/></div>
            </div>

            <div className="glass-panel rounded-[30px] p-6">
              <div className="flex items-center gap-2 text-white"><Palette size={18} className="text-fuchsia-300"/><h2 className="font-semibold">How the match is calculated</h2></div>
              <p className="mt-3 text-sm leading-7 text-zinc-500">The score compares the saved dominant colors in perceptual color space, weights them by how much of the skin they occupy and adds a small bonus when the primary color family matches. A manual admin palette takes priority over automatic image analysis.</p>
              {!colors.length ? <div className="mt-5 rounded-[20px] border border-amber-300/15 bg-amber-300/[.055] p-4 text-sm leading-6 text-amber-100/80">This skin has not been color-analyzed yet, so matching results are unavailable. Analyze it from the admin panel or run the batch color analyzer.</div> : null}
            </div>
          </div>

          <div className="mt-12 flex items-end justify-between gap-4">
            <div><div className="eyebrow">Suggested combo</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white">Best color matches for {skin.finish_name ?? skin.name}.</h2></div>
            <Sparkles className="text-zinc-700" size={20}/>
          </div>

          {matches.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{matches.map((match) => <ComboMatchCard key={match.skin.id} match={match}/>)}</div>
          ) : colors.length ? (
            <div className="mt-6 rounded-[26px] border border-dashed border-white/8 p-10 text-center text-sm text-zinc-600">No analyzed matching knife/glove candidates yet. Run color analysis on more skins to populate combo results.</div>
          ) : null}
        </section>
      ) : (
        <section className="mx-auto mt-14 max-w-5xl rounded-[34px] border border-white/[.06] bg-white/[.018] p-8 text-center md:p-12">
          <Sparkles className="mx-auto text-zinc-700" size={26}/><h2 className="mt-4 text-2xl font-semibold tracking-[-.04em] text-white">Pick a starting skin.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">Once a palette exists, SkinVersus will compare it against analyzed knives and gloves and rank the closest visual matches.</p>
        </section>
      )}
    </main>
  );
}
