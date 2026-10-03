import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const aliasMap: Record<string, string> = {
  // Weapons / common shorthand
  deagle: "desert eagle",
  "ak47": "ak 47",
  ak: "ak 47",
  "m4a1s": "m4a1 s",
  usps: "usp s",
  usp: "usp s",
  bfk: "butterfly knife",
  butterfly: "butterfly knife",
  kara: "karambit",
  karambit: "karambit",
  bayo: "bayonet",
  bayonet: "bayonet",
  m9: "m9 bayonet",
  m9bayo: "m9 bayonet",
  talon: "talon knife",
  skeleton: "skeleton knife",
  skele: "skeleton knife",
  stiletto: "stiletto knife",
  stilleto: "stiletto knife",
  ursus: "ursus knife",
  paracord: "paracord knife",
  survival: "survival knife",
  navaja: "navaja knife",
  nomad: "nomad knife",
  classic: "classic knife",
  gut: "gut knife",
  flip: "flip knife",
  huntsman: "huntsman knife",
  bowie: "bowie knife",
  falchion: "falchion knife",
  daggers: "shadow daggers",
  shadowdaggers: "shadow daggers",
  kukri: "kukri knife",
  // Common finish aliases / spacing variants
  printstream: "print stream",
  marblefade: "marble fade",
  tigerstooth: "tiger tooth",
  tigertooth: "tiger tooth",
  rustcoat: "rust coat",
  crimsonweb: "crimson web",
  redline: "red line",
  asiimov: "asiimov",
  asimov: "asiimov",
  assimov: "asiimov",
  assiimov: "asiimov",
  assiiimov: "asiimov",
  dopler: "doppler",
  dopller: "doppler",
  doppler: "doppler",
  autotronic: "autotronic",
  lore: "lore",
  hyperbeast: "hyper beast",
  wastelandrebel: "wasteland rebel",
  nightwish: "night wish",
  fuelinjector: "fuel injector",
  fuelinjection: "fuel injector",
  aquamarine: "aquamarine revenge",
};

const columns = "id,api_id,slug,name,weapon_name,finish_name,category,rarity_name,rarity_color,min_float,max_float,stattrak,souvenir,image_url,market_hash_name,price_usd";

function normalize(value: string) {
  let result = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[★|™()\[\]{}:_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Apply aliases to compact tokens first, then again after spacing normalization.
  result = result.split(" ").map((token) => aliasMap[token] ?? token).join(" ");
  return result.replace(/\s+/g, " ").trim();
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (a.length > b.length) [a, b] = [b, a];

  let previous = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j += 1) {
    const current = [j];
    for (let i = 1; i <= a.length; i += 1) {
      current[i] = Math.min(
        current[i - 1] + 1,
        previous[i] + 1,
        previous[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[a.length];
}

function typoDistance(token: string) {
  if (token.length <= 4) return 0;
  if (token.length <= 7) return 1;
  if (token.length <= 11) return 2;
  return 3;
}

function tokenMatch(queryToken: string, candidateTokens: string[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of candidateTokens) {
    if (candidate === queryToken) return 0;
    if (candidate.includes(queryToken) || queryToken.includes(candidate)) {
      best = Math.min(best, 0.25);
      continue;
    }
    const distance = levenshtein(queryToken, candidate);
    if (distance <= typoDistance(queryToken)) best = Math.min(best, distance);
  }
  return best;
}

function scoreSkin(skin: any, query: string, tokens: string[]) {
  const name = normalize(skin.name ?? "");
  const weapon = normalize(skin.weapon_name ?? "");
  const finish = normalize(skin.finish_name ?? "");
  const market = normalize(skin.market_hash_name ?? "");
  const haystack = `${name} ${weapon} ${finish} ${market}`;
  const candidateTokens = haystack.split(" ").filter(Boolean);
  const compactHaystack = compact(haystack);

  const compactQuery = compact(query);
  const exactPhrase = name === query || market === query;
  const phraseMatch = haystack.includes(query) || `${weapon} ${finish}`.includes(query) || `${finish} ${weapon}`.includes(query);
  const compactMatch = compactHaystack.includes(compactQuery);

  const matches = tokens.map((token) => tokenMatch(token, candidateTokens));
  if (matches.some((distance) => !Number.isFinite(distance))) return -1;

  const fuzzyPenalty = matches.reduce((sum, distance) => sum + distance, 0);
  let score = 1000 - fuzzyPenalty * 110;
  if (exactPhrase) score += 1500;
  if (phraseMatch) score += 700;
  if (compactMatch) score += 520;

  for (const token of tokens) {
    if (weapon === token || finish === token) score += 150;
    if (weapon.startsWith(token) || finish.startsWith(token)) score += 80;
    if (name.startsWith(token) || market.startsWith(token)) score += 45;
  }

  score += Math.min(tokens.length * 40, 200);
  return score;
}

async function searchCandidates(supabase: Awaited<ReturnType<typeof createClient>>, query: string, tokens: string[]) {
  const primary = [...tokens].sort((a, b) => b.length - a.length)[0].replace(/[,%_]/g, "");
  if (!primary) return [];

  const { data, error } = await supabase
    .from("skins")
    .select(columns)
    .or([
      `name.ilike.%${primary}%`,
      `weapon_name.ilike.%${primary}%`,
      `finish_name.ilike.%${primary}%`,
      `market_hash_name.ilike.%${primary}%`,
    ].join(","))
    .limit(320);

  if (error) throw error;
  return data ?? [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? "").trim();
  if (rawQuery.length < 2) return NextResponse.json({ items: [] });

  const query = normalize(rawQuery);
  const tokens = query.split(" ").filter(Boolean).slice(0, 10);
  if (!tokens.length) return NextResponse.json({ items: [] });

  const supabase = await createClient();
  let candidates = await searchCandidates(supabase, query, tokens);

  // If the exact/alias candidate lookup misses a typo such as “assiimov”,
  // fall back to the full lightweight name index. The database is only ~2k
  // skins, so this is cheap and makes search resilient to human mistakes.
  if (!candidates.length && query.replace(/\s/g, "").length >= 5) {
    const { data, error } = await supabase
      .from("skins")
      .select(columns)
      .limit(5000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    candidates = data ?? [];
  }

  const ranked = candidates
    .map((skin) => ({ skin, score: scoreSkin(skin, query, tokens) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || String(a.skin.name).localeCompare(String(b.skin.name)))
    .slice(0, 14);

  return NextResponse.json({
    items: ranked.map((item) => item.skin),
    smartMatch: ranked.length > 0 && ranked[0].score < 1600,
  });
}
