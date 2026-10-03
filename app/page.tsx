import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Layers3,
  MessageSquare,
  Palette,
  ShieldCheck,
  Sparkles,
  Swords,
  ThumbsUp,
} from "lucide-react";
import { CompareBuilder } from "@/components/CompareBuilder";
import { MultiCompareBuilder } from "@/components/MultiCompareBuilder";
import { RandomBattleButton } from "@/components/RandomBattleButton";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SkinFinder } from "@/components/SkinFinder";
import { getPlatformStats, getTopSkins } from "@/lib/data";
import { compactNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [top, stats] = await Promise.all([getTopSkins(6), getPlatformStats()]);

  return (
    <main className="overflow-hidden">
      <section className="hero-shell relative isolate">
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div className="hero-orb hero-orb-c" />
        <div className="hero-grid" />

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-20 md:pb-28 md:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="hero-title text-balance text-[clamp(3.4rem,8.3vw,7.7rem)] font-semibold leading-[.88] tracking-[-.075em] text-white">
              Compare skins. Find combos.<br />It never was this easy.
            </h1>
            <p className="hero-copy mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-zinc-400 md:text-xl md:leading-8">
              Put any two CS2 skins head-to-head, see what the community prefers and why, and discover compatible knife or glove combos by color.
            </p>
          </div>

          <div className="hero-builder mx-auto mt-12 max-w-5xl md:mt-16">
            <CompareBuilder />
            <div className="mt-4 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
              <p className="text-xs text-zinc-500">Search naturally — <span className="text-zinc-400">tiger tooth talon</span>, <span className="text-zinc-400">doppler m9</span>, <span className="text-zinc-400">deagle printstream</span>.</p>
              <RandomBattleButton />
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-white/[.06] bg-white/[.06] md:grid-cols-4">
            {[
              [compactNumber(stats.skins), "skins indexed"],
              [compactNumber(stats.battles), "battle votes"],
              [compactNumber(stats.reactions), "skin reactions"],
              [compactNumber(stats.reviews), "player reviews"],
            ].map(([value, label]) => (
              <div key={label} className="bg-[#0a0c10]/86 px-4 py-5 text-center backdrop-blur-xl">
                <div className="stat-number text-xl font-semibold tracking-[-.03em] text-white md:text-2xl">{value}</div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="multi-compare" className="section-wash-blue relative border-y border-white/[.065]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <ScrollReveal>
            <div className="max-w-xl">
              <div className="eyebrow">Shortlist mode</div>
              <h2 className="section-title mt-4">Can’t decide which skin to buy?</h2>
              <p className="section-copy mt-6 text-base">Put up to four skins next to each other. No voting, no forced winner — just a clean view of community score, approval, float, rarity and the data you need before spending.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-xs text-zinc-500">
                {["2–4 skins", "No login", "No battle vote", "One clean table"].map((item) => <span key={item} className="rounded-full border border-white/8 bg-white/[.025] px-3 py-2">{item}</span>)}
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={90}><MultiCompareBuilder /></ScrollReveal>
        </div>
      </section>

      <section className="section-wash-violet px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="eyebrow">Already have one in mind?</div>
              <h2 className="section-title mt-4">See what other players say about it.</h2>
              <p className="section-copy mx-auto mt-5 max-w-2xl">Find a specific skin, open its community page and instantly upvote or downvote it. Reviews require an account; reactions do not.</p>
            </div>
          </ScrollReveal>
          <div className="mx-auto mt-12 max-w-3xl"><ScrollReveal delay={80}><SkinFinder /></ScrollReveal></div>
        </div>
      </section>

      <section className="section-wash-mint border-y border-white/[.065]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:py-32 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <ScrollReveal>
            <div>
              <div className="eyebrow">Palette intelligence</div>
              <h2 className="section-title mt-4">Build knife + glove combos by color.</h2>
              <p className="section-copy mt-5 max-w-xl">SkinVersus can analyze dominant colors from skin artwork, translate them into readable color families and rank compatible knives or gloves by perceptual palette similarity.</p>
              <Link href="/combos" className="primary-button mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold">Open Combo Finder <ArrowRight size={16} /></Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={90}>
            <div className="glass-panel rounded-[34px] p-6 md:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Palette size={18} className="text-fuchsia-300" /> What the palette system adds</div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">{[["Auto colors", "Extract dominant colors once and save them in Supabase."], ["Manual override", "Correct tricky skins without changing application code."], ["Combo score", "Match palettes using perceptual distance instead of raw HEX equality."], ["Skin insights", "Add float, pattern and combo tips from the admin panel."]].map(([title, copy]) => <div key={title} className="rounded-[20px] border border-white/[.06] bg-black/15 p-4"><div className="text-sm font-semibold text-white">{title}</div><p className="mt-2 text-xs leading-5 text-zinc-400">{copy}</p></div>)}</div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-wash-purple border-b border-white/[.065]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:py-32">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="eyebrow">One place. Better signal.</div>
              <h2 className="section-title mt-4">Less tab-hopping. More context.</h2>
              <p className="section-copy mx-auto mt-5 max-w-2xl">SkinVersus combines objective item data with community preference so you can understand not only what differs, but what players actually care about.</p>
            </div>
          </ScrollReveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [BarChart3, "Side-by-side data", "Float, rarity, availability and tracked market data in a single comparison."],
              [Swords, "Head-to-head battles", "Every 1v1 can become a community vote, building preference data over time."],
              [ThumbsUp, "Skin approval", "Rate an individual skin without needing to compare it against something else."],
              [MessageSquare, "Player reviews", "See why players love a finish, dislike its value or pair it with specific combos."],
            ].map(([Icon, title, text]: any, index) => (
              <ScrollReveal key={title} delay={index * 70}>
                <div className="feature-card h-full rounded-[28px] border border-white/8 bg-white/[.022] p-7">
                  <div className="grid size-11 place-items-center rounded-2xl border border-white/8 bg-white/[.04]"><Icon size={19} className="text-zinc-200" /></div>
                  <h3 className="mt-8 text-lg font-semibold tracking-tight text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wash-rankings px-5 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="eyebrow">Community rankings</div><h2 className="section-title mt-3">What players pick right now.</h2></div>
              <Link href="/rankings" className="interactive group inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition hover:text-white">Explore the ranking <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
            </div>
          </ScrollReveal>

          {top.length ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {top.map((skin, index) => (
                <ScrollReveal key={skin.id} delay={(index % 3) * 55}>
                  <Link href={`/skins/${skin.slug}`} className="feature-card group flex min-h-28 items-center gap-4 rounded-[26px] border border-white/8 bg-white/[.022] p-4">
                    <div className="w-8 text-center text-base font-semibold text-zinc-500">{String(index + 1).padStart(2, "0")}</div>
                    <div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-white/[.03] bg-black/20">{skin.image_url ? <img src={skin.image_url} alt="" className="max-h-14 max-w-[76px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.5)] transition duration-500 group-hover:scale-105" /> : null}</div>
                    <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{skin.name}</div><div className="mt-1 text-xs text-zinc-400">{skin.battle_wins ?? 0} wins · {skin.likes ?? 0} upvotes</div></div>
                    <div className="pr-1 text-right"><div className="text-2xl font-semibold tracking-tight text-white">{Number(skin.community_score ?? 50).toFixed(0)}</div><div className="text-[9px] uppercase tracking-[.18em] text-zinc-500">score</div></div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          ) : <div className="rounded-[28px] border border-white/8 bg-white/[.02] p-7 text-sm text-zinc-400">Import skins and start voting to populate the ranking.</div>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:pb-32">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[.032] px-6 py-16 text-center shadow-[0_40px_120px_rgba(0,0,0,.25)] md:px-12 md:py-20">
            <div className="pointer-events-none absolute left-1/2 top-[-14rem] h-80 w-[42rem] -translate-x-1/2 rounded-full bg-blue-500/15 blur-[100px]" />
            <ShieldCheck className="relative mx-auto text-zinc-400" size={28} />
            <h2 className="relative mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold tracking-[-.045em] text-white md:text-5xl">The data helps. The final pick is still yours.</h2>
            <p className="relative mx-auto mt-5 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">No fake “best skin” badge. SkinVersus shows community preference, item data and trade-offs — you decide what matters for your inventory.</p>
            <a href="#top" className="primary-button relative mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold">Start a comparison <ArrowRight size={16} /></a>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
