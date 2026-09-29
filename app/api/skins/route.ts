import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const aliases: Array<[RegExp, string]> = [
  [/\bdeagle\b/g, "desert eagle"],
  [/\bak47\b/g, "ak 47"],
  [/\bak\b(?!\s*47)/g, "ak 47"],
  [/\bm4a1s\b/g, "m4a1 s"],
  [/\busps\b/g, "usp s"],
  [/\bbfk\b/g, "butterfly knife"],
  [/\bkara\b/g, "karambit"],
];

function normalize(value: string) {
  let result = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[★|™()\[\]{}:_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of aliases) result = result.replace(pattern, replacement);
  return result.replace(/\s+/g, " ").trim();
}

function scoreSkin(skin: any, query: string, tokens: string[]) {
  const name = normalize(skin.name ?? "");
  const weapon = normalize(skin.weapon_name ?? "");
  const finish = normalize(skin.finish_name ?? "");
  const market = normalize(skin.market_hash_name ?? "");
  const haystack = `${name} ${weapon} ${finish} ${market}`;

  if (!tokens.every((token) => haystack.includes(token))) return -1;

  let score = 100;
  if (name === query || market === query) score += 1200;
  if (name.includes(query) || market.includes(query)) score += 520;
  if (`${weapon} ${finish}`.includes(query) || `${finish} ${weapon}`.includes(query)) score += 440;

  for (const token of tokens) {
    if (weapon === token || finish === token) score += 110;
    if (weapon.startsWith(token) || finish.startsWith(token)) score += 65;
    if (name.startsWith(token) || market.startsWith(token)) score += 35;
  }

  score += Math.min(tokens.length * 28, 168);
  return score;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? "").trim();
  if (rawQuery.length < 2) return NextResponse.json({ items: [] });

  const query = normalize(rawQuery);
  const tokens = query.split(" ").filter(Boolean).slice(0, 10);
  if (!tokens.length) return NextResponse.json({ items: [] });

  // Search by the most distinctive token, then require every query token locally.
  // This keeps the candidate pool small while allowing any word order.
  const primary = [...tokens].sort((a, b) => b.length - a.length)[0].replace(/[,%_]/g, "");
  const supabase = await createClient();
  const columns = "id,api_id,slug,name,weapon_name,finish_name,category,rarity_name,rarity_color,min_float,max_float,stattrak,souvenir,image_url,market_hash_name,price_usd";

  const { data, error } = await supabase
    .from("skins")
    .select(columns)
    .or([
      `name.ilike.%${primary}%`,
      `weapon_name.ilike.%${primary}%`,
      `finish_name.ilike.%${primary}%`,
      `market_hash_name.ilike.%${primary}%`,
    ].join(","))
    .limit(220);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? [])
    .map((skin) => ({ skin, score: scoreSkin(skin, query, tokens) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || String(a.skin.name).localeCompare(String(b.skin.name)))
    .slice(0, 14)
    .map((item) => item.skin);

  return NextResponse.json({ items });
}
