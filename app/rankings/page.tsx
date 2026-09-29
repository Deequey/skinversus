import { Trophy } from "lucide-react";
import { RankingExplorer } from "@/components/RankingExplorer";
import { getTopSkins } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const skins = await getTopSkins(200);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-12 md:pt-16">
      <div className="mb-10 max-w-3xl">
        <div className="eyebrow flex items-center gap-2"><Trophy size={12} className="text-amber-300" /> Community ranking</div>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-.06em] text-white md:text-7xl">The skins players keep picking.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-500 md:text-base">Community Score combines head-to-head battle performance and direct upvote/downvote approval. It is a preference signal — not a price forecast or investment rating.</p>
      </div>
      <RankingExplorer skins={skins} />
    </main>
  );
}
