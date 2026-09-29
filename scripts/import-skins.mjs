import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const source = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

console.log("Downloading CS2 skins...");
const res = await fetch(source);
if (!res.ok) throw new Error(`Could not fetch skins: ${res.status}`);
const skins = await res.json();
console.log(`Fetched ${skins.length} skins`);

const baseSlugs = skins.map((item) => slugify(item.name));
const slugCounts = new Map();
for (const slug of baseSlugs) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);

const rows = skins.map((item, index) => {
  const split = String(item.name ?? "").split("|");
  const baseSlug = baseSlugs[index];
  const slug = slugCounts.get(baseSlug) > 1 ? `${baseSlug}-${String(item.id).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}` : baseSlug;
  return {
    api_id: item.id ?? null,
    slug,
    name: item.name,
    weapon_name: item.weapon?.name ?? split[0]?.trim() ?? null,
    finish_name: item.pattern?.name ?? split[1]?.trim() ?? null,
    category: item.category?.name ?? null,
    rarity_name: item.rarity?.name ?? null,
    rarity_color: item.rarity?.color ?? null,
    min_float: item.min_float ?? null,
    max_float: item.max_float ?? null,
    stattrak: Boolean(item.stattrak),
    souvenir: Boolean(item.souvenir),
    image_url: item.image ?? null,
    market_hash_name: item.market_hash_name ?? null,
    updated_at: new Date().toISOString(),
  };
});

const chunkSize = 250;
for (let i = 0; i < rows.length; i += chunkSize) {
  const chunk = rows.slice(i, i + chunkSize);
  const { error } = await supabase.from("skins").upsert(chunk, { onConflict: "api_id" });
  if (error) throw error;
  console.log(`Imported ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
}

console.log("Done.");
