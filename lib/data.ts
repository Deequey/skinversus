import { createClient } from "@/lib/supabase/server";
import type { PlatformStats, RankedSkin, Skin } from "@/lib/types";

export async function getSkinBySlug(slug: string): Promise<Skin | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("skins").select("*").eq("slug", slug).maybeSingle();
  return (data as Skin | null) ?? null;
}

export async function getRankedSkinBySlug(slug: string): Promise<RankedSkin | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("skin_rankings").select("*").eq("slug", slug).maybeSingle();
  return (data as RankedSkin | null) ?? null;
}

export async function getRankedSkinsBySlugs(slugs: string[]): Promise<RankedSkin[]> {
  if (!slugs.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("skin_rankings").select("*").in("slug", slugs);
  const bySlug = new Map((data ?? []).map((skin: any) => [skin.slug, skin as RankedSkin]));
  return slugs.map((slug) => bySlug.get(slug)).filter((skin): skin is RankedSkin => Boolean(skin));
}

export async function getTopSkins(limit = 8): Promise<RankedSkin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_rankings")
    .select("*")
    .order("community_score", { ascending: false })
    .order("battle_votes", { ascending: false })
    .limit(limit);
  return (data as RankedSkin[] | null) ?? [];
}

export async function getRecentReviews(skinId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, user_id, profiles(username)")
    .eq("skin_id", skinId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getReviewStats(skinId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_review_stats")
    .select("*")
    .eq("skin_id", skinId)
    .maybeSingle();
  return data;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const [skins, battles, reviews, reactions] = await Promise.all([
    supabase.from("skins").select("id", { count: "exact", head: true }),
    supabase.from("votes").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("skin_reactions").select("id", { count: "exact", head: true }),
  ]);

  return {
    skins: skins.count ?? 0,
    battles: battles.count ?? 0,
    reviews: reviews.count ?? 0,
    reactions: reactions.count ?? 0,
  };
}

export async function getRelatedSkins(weaponName: string | null, excludeId: string, limit = 4): Promise<RankedSkin[]> {
  if (!weaponName) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_rankings")
    .select("*")
    .eq("weapon_name", weaponName)
    .neq("id", excludeId)
    .order("community_score", { ascending: false })
    .limit(limit);
  return (data as RankedSkin[] | null) ?? [];
}
