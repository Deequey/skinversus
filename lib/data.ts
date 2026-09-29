import { createClient } from "@/lib/supabase/server";
import type { ComboMatch, PlatformStats, RankedSkin, Skin, SkinColor, SkinNote } from "@/lib/types";
import { activePalette, paletteMatchScore } from "@/lib/color";

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


export async function getSkinColors(skinId: string): Promise<SkinColor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_colors")
    .select("*")
    .eq("skin_id", skinId)
    .order("source", { ascending: false })
    .order("sort_order", { ascending: true });
  return activePalette((data as SkinColor[] | null) ?? []);
}

export async function getAllSkinColors(skinId: string): Promise<SkinColor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_colors")
    .select("*")
    .eq("skin_id", skinId)
    .order("source", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data as SkinColor[] | null) ?? [];
}

export async function getSkinNotes(skinId: string): Promise<SkinNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skin_notes")
    .select("*")
    .eq("skin_id", skinId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  return (data as SkinNote[] | null) ?? [];
}

function comboTargetFilter(skin: Skin) {
  const haystack = `${skin.category ?? ""} ${skin.weapon_name ?? ""}`.toLowerCase();
  const isGlove = haystack.includes("glove");
  const isKnife = haystack.includes("knife") || haystack.includes("bayonet") || haystack.includes("karambit") || haystack.includes("daggers");
  if (isGlove) return "knife" as const;
  if (isKnife) return "glove" as const;
  return "gear" as const;
}

export async function getComboMatchesForSkin(skin: Skin, limit = 8): Promise<ComboMatch[]> {
  const sourceColors = await getSkinColors(skin.id);
  if (!sourceColors.length) return [];

  const supabase = await createClient();
  const target = comboTargetFilter(skin);
  const candidatePageSize = 400;
  const ranked: RankedSkin[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("skin_rankings")
      .select("*")
      .neq("id", skin.id)
      .order("id", { ascending: true });

    if (target === "glove") {
      query = query.or("category.ilike.%glove%,weapon_name.ilike.%glove%");
    } else if (target === "knife") {
      query = query.or("category.ilike.%knife%,weapon_name.ilike.%knife%,weapon_name.ilike.%bayonet%,weapon_name.ilike.%karambit%,weapon_name.ilike.%daggers%");
    } else {
      query = query.or("category.ilike.%glove%,weapon_name.ilike.%glove%,category.ilike.%knife%,weapon_name.ilike.%knife%,weapon_name.ilike.%bayonet%,weapon_name.ilike.%karambit%,weapon_name.ilike.%daggers%");
    }

    const { data, error } = await query.range(from, from + candidatePageSize - 1);
    if (error) throw error;
    const page = (data as RankedSkin[] | null) ?? [];
    ranked.push(...page);
    if (page.length < candidatePageSize) break;
    from += candidatePageSize;
  }

  if (!ranked.length) return [];

  const grouped = new Map<string, SkinColor[]>();
  const colorChunkSize = 80;

  for (let i = 0; i < ranked.length; i += colorChunkSize) {
    const ids = ranked.slice(i, i + colorChunkSize).map((candidate) => candidate.id);
    const { data: colorRows, error } = await supabase
      .from("skin_colors")
      .select("*")
      .in("skin_id", ids);
    if (error) throw error;

    for (const color of ((colorRows as SkinColor[] | null) ?? [])) {
      const list = grouped.get(color.skin_id) ?? [];
      list.push(color);
      grouped.set(color.skin_id, list);
    }
  }

  return ranked
    .map((candidate) => {
      const colors = activePalette(grouped.get(candidate.id) ?? []);
      return { skin: candidate, colors, match_score: paletteMatchScore(sourceColors, colors) };
    })
    .filter((item) => item.colors.length > 0)
    .sort((a, b) => b.match_score - a.match_score || Number(b.skin.community_score ?? 0) - Number(a.skin.community_score ?? 0))
    .slice(0, limit);
}

export async function isCurrentUserAdmin() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return Boolean(data?.is_admin);
}
