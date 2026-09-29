import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Check, MessageSquare, Swords } from "lucide-react";
import { CompareFromSkin } from "@/components/CompareFromSkin";
import { ReactionButtons } from "@/components/ReactionButtons";
import { ReviewForm } from "@/components/ReviewForm";
import { ShareButton } from "@/components/ShareButton";
import { getRankedSkinBySlug, getRecentReviews, getRelatedSkins, getReviewStats, getSkinBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { approvalPct, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skin = await getSkinBySlug(slug);
  if (!skin) return { title: "Skin" };
  return { title: skin.name, description: `Community score, battles, float range and reviews for ${skin.name}.` };
}

export default async function SkinPage({ params }: Props) {
  const { slug } = await params;
  const ranked = await getRankedSkinBySlug(slug);
  const skin = ranked ?? await getSkinBySlug(slug);
  if (!skin) notFound();

  const supabase = await createClient();
  const [auth, reviews, reviewStats, related] = await Promise.all([
    supabase.auth.getClaims(),
    getRecentReviews(skin.id),
    getReviewStats(skin.id),
    getRelatedSkins(skin.weapon_name, skin.id, 4),
  ]);

  const signedIn = Boolean(auth.data?.claims?.sub);
  const likes = Number((ranked as any)?.likes ?? 0);
  const dislikes = Number((ranked as any)?.dislikes ?? 0);
  const approval = approvalPct(likes, dislikes);
  const score = Number((ranked as any)?.community_score ?? 50);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 md:pt-16">
      <div className="mb-8 flex items-center justify-end"><ShareButton title={skin.name} /></div>

      <section className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
        <div className="relative grid min-h-[390px] place-items-center overflow-hidden rounded-[38px] border border-white/8 bg-white/[.022] p-8 shadow-[0_35px_110px_rgba(0,0,0,.25)] md:min-h-[500px]">
          <div className="absolute left-1/2 top-[18%] h-48 w-80 -translate-x-1/2 rounded-full opacity-25 blur-[75px]" style={{ background: skin.rarity_color ?? "#6ea8ff" }} />
          <div className="soft-grid absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          {skin.image_url ? <img src={skin.image_url} alt={skin.name} className="relative max-h-[310px] max-w-[95%] object-contain drop-shadow-[0_38px_44px_rgba(0,0,0,.62)] md:max-h-[390px]" /> : null}
        </div>

        <div className="lg:pl-5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500">{skin.rarity_color ? <span className="size-1.5 rounded-full" style={{ background: skin.rarity_color }} /> : null}{skin.weapon_name ?? skin.category}</div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-.06em] text-white md:text-6xl">{skin.finish_name ?? skin.name}</h1>
          <p className="mt-3 text-sm text-zinc-600">{skin.name}</p>

          <div className="mt-8 flex items-center gap-5">
            <div className="score-ring size-24 shrink-0" style={{ "--score": score } as CSSProperties}><div className="text-center"><div className="text-2xl font-semibold tracking-[-.04em] text-white">{score.toFixed(0)}</div><div className="text-[8px] font-semibold uppercase tracking-[.15em] text-zinc-700">score</div></div></div>
            <div><div className="text-2xl font-semibold tracking-[-.04em] text-white">{approval}% positive</div><p className="mt-1 max-w-md text-sm leading-6 text-zinc-600">Combined community signal from head-to-head battles and direct skin reactions.</p></div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Battle wins", String((ranked as any)?.battle_wins ?? 0)],
              ["Reviews", String(reviewStats?.review_count ?? 0)],
              ["Rating", reviewStats?.average_rating ? `${reviewStats.average_rating}/10` : "—"],
              ["Tracked price", formatPrice(skin.price_usd)],
            ].map(([label, value]) => <div key={label} className="rounded-[20px] border border-white/8 bg-white/[.022] p-4"><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-zinc-700">{label}</div><div className="mt-2 text-base font-semibold text-white">{value}</div></div>)}
          </div>

          <div className="mt-5"><ReactionButtons slug={skin.slug} likes={likes} dislikes={dislikes} /></div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
        <div className="space-y-5">
          <div className="glass-panel rounded-[30px] p-6">
            <div className="flex items-center gap-2 text-white"><BarChart3 size={18} className="text-cyan-300"/><h2 className="font-semibold">Skin data</h2></div>
            <dl className="mt-5 space-y-4 text-sm">
              {[
                ["Weapon", skin.weapon_name ?? "—"], ["Category", skin.category ?? "—"], ["Rarity", skin.rarity_name ?? "—"],
                ["Min float", skin.min_float?.toFixed(4) ?? "—"], ["Max float", skin.max_float?.toFixed(4) ?? "—"],
                ["StatTrak", skin.stattrak ? "Available" : "No"], ["Souvenir", skin.souvenir ? "Available" : "No"],
              ].map(([k, v]) => <div key={k} className="flex justify-between gap-6 border-b border-white/[.055] pb-3 last:border-0"><dt className="text-zinc-600">{k}</dt><dd className="font-medium text-zinc-300">{v === "Available" ? <span className="inline-flex items-center gap-1 text-emerald-300"><Check size={13}/>{v}</span> : v}</dd></div>)}
            </dl>
          </div>
          <CompareFromSkin skin={skin} />
        </div>

        <div className="glass-panel rounded-[30px] p-5 md:p-6">
          <div className="flex items-start justify-between gap-5"><div className="flex items-center gap-2 text-white"><MessageSquare size={18} className="text-violet-300"/><h2 className="font-semibold">Player reviews</h2></div>{reviewStats?.average_rating ? <div className="text-right"><div className="text-xl font-semibold text-white">{reviewStats.average_rating}<span className="text-xs text-zinc-700">/10</span></div><div className="text-[9px] uppercase tracking-[.14em] text-zinc-700">average</div></div> : null}</div>
          <div className="mt-5"><ReviewForm skinId={skin.id} signedIn={signedIn} /></div>
          <div className="mt-5 space-y-3">
            {reviews.length ? reviews.map((review: any) => (
              <article key={review.id} className="rounded-[22px] border border-white/[.06] bg-black/15 p-5">
                <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white">{review.profiles?.username ?? "Player"}</div><div className="mt-1 text-[10px] text-zinc-700">{new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div></div><div className="rounded-xl border border-amber-300/12 bg-amber-300/[.06] px-2.5 py-1.5 text-sm font-semibold text-amber-200">{review.rating}/10</div></div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{review.body}</p>
              </article>
            )) : <div className="rounded-[22px] border border-dashed border-white/8 p-8 text-center text-sm text-zinc-600">No reviews yet. Be the first player to explain what makes this skin worth it — or not.</div>}
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="mt-20">
          <div className="mb-7 flex items-end justify-between gap-4"><div><div className="eyebrow">Keep exploring</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white">More {skin.weapon_name} skins.</h2></div><Swords className="text-zinc-700" size={20}/></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => <Link key={item.id} href={`/skins/${item.slug}`} className="feature-card group rounded-[26px] border border-white/8 bg-white/[.022] p-4"><div className="grid h-36 place-items-center rounded-[20px] bg-black/20" style={{ background: `radial-gradient(circle, ${item.rarity_color ?? "#6ea8ff"}14, transparent 65%)` }}>{item.image_url ? <img src={item.image_url} alt="" className="max-h-24 max-w-[90%] object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,.5)] transition duration-500 group-hover:scale-105" /> : null}</div><div className="mt-4 truncate text-sm font-semibold text-white">{item.finish_name ?? item.name}</div><div className="mt-1 text-xs text-zinc-600">{Number(item.community_score ?? 50).toFixed(0)}/100 community score</div></Link>)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
