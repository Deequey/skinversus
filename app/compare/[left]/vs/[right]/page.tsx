import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Minus, Sparkles } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { SkinVisual } from "@/components/SkinVisual";
import { VotePanel } from "@/components/VotePanel";
import { getRankedSkinsBySlugs, getSkinBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ left: string; right: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { left, right } = await params;
  const [a, b] = await Promise.all([getSkinBySlug(left), getSkinBySlug(right)]);
  if (!a || !b) return { title: "Comparison" };
  return { title: `${a.name} vs ${b.name}`, description: `Compare ${a.name} vs ${b.name}: float range, rarity, community votes and player opinions.` };
}

export default async function ComparisonPage({ params }: Props) {
  const { left: leftSlug, right: rightSlug } = await params;
  const ranked = await getRankedSkinsBySlugs([leftSlug, rightSlug]);
  const left = ranked[0] ?? await getSkinBySlug(leftSlug);
  const right = ranked[1] ?? await getSkinBySlug(rightSlug);
  if (!left || !right || left.id === right.id) notFound();

  const supabase = await createClient();
  const { data: comparisonId, error } = await supabase.rpc("ensure_comparison", { left_skin: left.id, right_skin: right.id });
  if (error || !comparisonId) throw new Error(error?.message ?? "Could not create comparison");

  const [{ data: stats }, { data: reviewStats }] = await Promise.all([
    supabase.from("comparison_stats").select("*").eq("comparison_id", comparisonId).maybeSingle(),
    supabase.from("skin_review_stats").select("*").in("skin_id", [left.id, right.id]),
  ]);

  const leftReview = reviewStats?.find((row: any) => row.skin_id === left.id);
  const rightReview = reviewStats?.find((row: any) => row.skin_id === right.id);
  const total = Number(stats?.total_votes ?? 0);
  const aVotes = Number(stats?.a_votes ?? 0);
  const bVotes = Number(stats?.b_votes ?? 0);
  const leftVotes = stats?.skin_a_id === left.id ? aVotes : bVotes;
  const rightVotes = stats?.skin_b_id === right.id ? bVotes : aVotes;
  const leftRank: any = left;
  const rightRank: any = right;

  const rows = [
    ["Community score", leftRank.community_score != null ? `${Number(leftRank.community_score).toFixed(0)}/100` : "—", rightRank.community_score != null ? `${Number(rightRank.community_score).toFixed(0)}/100` : "—"],
    ["Player rating", leftReview?.average_rating ? `${leftReview.average_rating}/10` : "—", rightReview?.average_rating ? `${rightReview.average_rating}/10` : "—"],
    ["Reviews", String(leftReview?.review_count ?? 0), String(rightReview?.review_count ?? 0)],
    ["Tracked price", formatPrice(left.price_usd), formatPrice(right.price_usd)],
    ["Rarity", left.rarity_name ?? "—", right.rarity_name ?? "—"],
    ["Min float", left.min_float?.toFixed(4) ?? "—", right.min_float?.toFixed(4) ?? "—"],
    ["Max float", left.max_float?.toFixed(4) ?? "—", right.max_float?.toFixed(4) ?? "—"],
    ["StatTrak", left.stattrak ? "Available" : "No", right.stattrak ? "Available" : "No"],
    ["Souvenir", left.souvenir ? "Available" : "No", right.souvenir ? "Available" : "No"],
    ["Category", left.category ?? "—", right.category ?? "—"],
  ];

  const leftReasons: string[] = [];
  const rightReasons: string[] = [];
  if (leftVotes > rightVotes) leftReasons.push(`More head-to-head votes (${leftVotes} vs ${rightVotes})`);
  if (rightVotes > leftVotes) rightReasons.push(`More head-to-head votes (${rightVotes} vs ${leftVotes})`);
  if (Number(leftRank.community_score ?? 0) > Number(rightRank.community_score ?? 0)) leftReasons.push(`Higher overall community score (${Number(leftRank.community_score).toFixed(0)} vs ${Number(rightRank.community_score).toFixed(0)})`);
  if (Number(rightRank.community_score ?? 0) > Number(leftRank.community_score ?? 0)) rightReasons.push(`Higher overall community score (${Number(rightRank.community_score).toFixed(0)} vs ${Number(leftRank.community_score).toFixed(0)})`);
  if (left.price_usd != null && right.price_usd != null) {
    if (left.price_usd < right.price_usd) leftReasons.push(`Lower tracked price (${formatPrice(left.price_usd)} vs ${formatPrice(right.price_usd)})`);
    if (right.price_usd < left.price_usd) rightReasons.push(`Lower tracked price (${formatPrice(right.price_usd)} vs ${formatPrice(left.price_usd)})`);
  }
  if (Number(leftReview?.average_rating ?? 0) > Number(rightReview?.average_rating ?? 0)) leftReasons.push(`Higher player rating (${leftReview.average_rating}/10)`);
  if (Number(rightReview?.average_rating ?? 0) > Number(leftReview?.average_rating ?? 0)) rightReasons.push(`Higher player rating (${rightReview.average_rating}/10)`);
  if (left.stattrak && !right.stattrak) leftReasons.push("StatTrak version available");
  if (right.stattrak && !left.stattrak) rightReasons.push("StatTrak version available");

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 md:pt-16">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link href="/#top" className="interactive inline-flex items-center gap-2 text-xs font-medium text-zinc-600 transition hover:text-white"><ArrowLeft size={14} /> New comparison</Link>
        <ShareButton title={`${left.name} vs ${right.name}`} />
      </div>

      <div className="mx-auto mb-12 max-w-5xl text-center">
        <div className="eyebrow">Head-to-head comparison</div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-.052em] text-white md:text-6xl">{left.finish_name ?? left.name} <span className="font-normal text-zinc-700">vs</span> {right.finish_name ?? right.name}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600">Compare the details, then cast your vote. You can change your pick later.</p>
      </div>

      <section className="relative grid gap-8 md:grid-cols-[1fr_64px_1fr] md:items-start">
        <SkinVisual skin={left} score={leftRank.community_score} />
        <div className="mx-auto mt-32 hidden size-14 place-items-center rounded-full border border-white/8 bg-white/[.025] text-[10px] font-bold tracking-[.2em] text-zinc-600 md:grid">VS</div>
        <SkinVisual skin={right} score={rightRank.community_score} />
      </section>

      <div className="mt-14"><VotePanel comparisonId={comparisonId as string} leftId={left.id} rightId={right.id} leftName={left.finish_name ?? left.name} rightName={right.finish_name ?? right.name} totalVotes={total} leftVotes={leftVotes} rightVotes={rightVotes} /></div>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          [left.finish_name ?? left.name, leftReasons, "text-cyan-300"],
          [right.finish_name ?? right.name, rightReasons, "text-violet-300"],
        ].map(([name, reasons, accent]: any) => (
          <div key={name} className="glass-panel rounded-[30px] p-6">
            <div className={`flex items-center gap-2 ${accent}`}><Sparkles size={17}/><span className="text-[10px] font-semibold uppercase tracking-[.2em]">What stands out</span></div>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white">{name}</h3>
            <div className="mt-4 space-y-3">{reasons.length ? reasons.slice(0, 4).map((reason: string) => <div key={reason} className="flex gap-2 text-sm leading-6 text-zinc-400"><Check className="mt-1 shrink-0 text-emerald-300" size={15}/><span>{reason}</span></div>) : <p className="text-sm text-zinc-600">Not enough community data yet. Your vote helps build it.</p>}</div>
          </div>
        ))}
      </section>

      <section className="glass-panel mt-5 overflow-hidden rounded-[30px]">
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-white/[.06] bg-white/[.02] px-4 py-4 text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-700 md:px-6"><div>Specification</div><div className="text-center">{left.finish_name ?? left.name}</div><div className="text-center">{right.finish_name ?? right.name}</div></div>
        {rows.map(([label, a, b]) => (
          <div key={label} className="grid grid-cols-[1fr_1fr_1fr] items-center border-b border-white/[.055] px-4 py-4 text-sm last:border-b-0 md:px-6">
            <div className="font-medium text-zinc-600">{label}</div>
            {[a, b].map((value, index) => <div key={index} className="text-center font-semibold text-zinc-200">{value === "Available" ? <span className="inline-flex items-center gap-1 text-emerald-300"><Check size={14}/>{value}</span> : value === "No" ? <span className="inline-flex items-center gap-1 text-zinc-700"><Minus size={14}/>{value}</span> : value}</div>)}
          </div>
        ))}
      </section>
    </main>
  );
}
