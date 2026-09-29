import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const force = process.argv.includes("--force");
const requestedLimit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 100) : Infinity;
const PAGE_SIZE = 500;
const EXISTING_CHUNK_SIZE = 250;
const concurrency = 4;

function family(hex) {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;

  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }

  if (l < 0.13) return "Black";
  if (l > 0.9 && s < 0.12) return "White";
  if (s < 0.11) return l > 0.68 ? "Silver" : "Gray";
  if (h < 12 || h >= 350) return l < 0.36 ? "Burgundy" : "Red";
  if (h < 28) return l < 0.38 ? "Brown" : "Orange";
  if (h < 46) return l < 0.48 ? "Brown" : l > 0.68 ? "Tan" : "Gold";
  if (h < 66) return "Yellow";
  if (h < 92) return "Lime";
  if (h < 145) return l < 0.34 ? "Emerald" : "Green";
  if (h < 176) return "Teal";
  if (h < 202) return "Cyan";
  if (h < 250) return l < 0.3 ? "Navy" : "Blue";
  if (h < 292) return "Purple";
  if (h < 350) return l < 0.33 ? "Purple" : "Pink";
  return "Red";
}

const hexByte = (value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0").toUpperCase();
const dist = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadImage(imageUrl) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(20_000),
        headers: { "User-Agent": "SkinVersus/1.0 color-analyzer" },
      });
      if (!response.ok) throw new Error(`image ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(500 * attempt);
    }
  }

  throw lastError ?? new Error("Image download failed");
}

async function analyze(imageUrl) {
  const input = await downloadImage(imageUrl);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize({ width: 112, height: 112, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  const step = 28;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;
    if (a < 72) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    if (brightness > 246 && max - min < 8) continue;

    const key = `${Math.round(r / step)},${Math.round(g / step)},${Math.round(b / step)}`;
    const weight = (a / 255) * (brightness < 14 ? 0.55 : 1);
    const current = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
    current.r += r * weight;
    current.g += g * weight;
    current.b += b * weight;
    current.w += weight;
    buckets.set(key, current);
  }

  const ranked = [...buckets.values()]
    .filter((entry) => entry.w > 0)
    .map((entry) => ({ r: entry.r / entry.w, g: entry.g / entry.w, b: entry.b / entry.w, w: entry.w }))
    .sort((a, b) => b.w - a.w);

  const picked = [];
  for (const entry of ranked) {
    if (picked.every((selected) => dist(entry, selected) >= 46)) picked.push(entry);
    if (picked.length === 5) break;
  }
  for (const entry of ranked) {
    if (picked.length === 5) break;
    if (!picked.includes(entry)) picked.push(entry);
  }

  if (!picked.length) throw new Error("no usable pixels found");

  const total = picked.reduce((sum, entry) => sum + entry.w, 0) || 1;
  const raw = picked.map((entry) => Math.max(1, Math.round((entry.w / total) * 100)));
  const rawTotal = raw.reduce((a, b) => a + b, 0) || 1;
  const normalized = raw.map((value, index) =>
    index === raw.length - 1
      ? Math.max(1, 100 - Math.round((raw.slice(0, -1).reduce((a, b) => a + b, 0) * 100) / rawTotal))
      : Math.max(1, Math.round((value * 100) / rawTotal)),
  );

  return picked.map((entry, index) => {
    const hex = `#${hexByte(entry.r)}${hexByte(entry.g)}${hexByte(entry.b)}`;
    return {
      hex,
      percentage: normalized[index],
      color_name: family(hex),
      is_primary: index === 0,
      source: "auto",
      sort_order: index,
    };
  });
}

async function fetchSkins() {
  const skins = [];
  let from = 0;

  while (skins.length < requestedLimit) {
    const remaining = Number.isFinite(requestedLimit) ? requestedLimit - skins.length : PAGE_SIZE;
    const pageSize = Math.min(PAGE_SIZE, remaining);
    if (pageSize <= 0) break;

    const { data, error } = await supabase
      .from("skins")
      .select("id,name,image_url")
      .not("image_url", "is", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = data ?? [];
    skins.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return skins;
}

async function fetchAlreadyAnalyzed(skins) {
  const existing = new Set();
  if (force || !skins.length) return existing;

  for (let i = 0; i < skins.length; i += EXISTING_CHUNK_SIZE) {
    const ids = skins.slice(i, i + EXISTING_CHUNK_SIZE).map((skin) => skin.id);
    const { data, error } = await supabase
      .from("skin_colors")
      .select("skin_id")
      .eq("source", "auto")
      .eq("is_primary", true)
      .in("skin_id", ids);

    if (error) throw error;
    for (const row of data ?? []) existing.add(row.skin_id);
  }

  return existing;
}

const skins = await fetchSkins();
const existing = await fetchAlreadyAnalyzed(skins);
const pending = skins.filter((skin) => force || !existing.has(skin.id));

console.log(`Found ${skins.length} skins with images.`);
console.log(`Color analysis: ${pending.length} pending (${existing.size} already analyzed, force=${force})`);

let done = 0;
let failed = 0;
const failedSkins = [];

for (let i = 0; i < pending.length; i += concurrency) {
  await Promise.all(
    pending.slice(i, i + concurrency).map(async (skin) => {
      try {
        const colors = await analyze(skin.image_url);
        if (force) {
          const { error: deleteError } = await supabase
            .from("skin_colors")
            .delete()
            .eq("skin_id", skin.id)
            .eq("source", "auto");
          if (deleteError) throw deleteError;
        }

        if (colors.length) {
          const { error: upsertError } = await supabase
            .from("skin_colors")
            .upsert(colors.map((color) => ({ ...color, skin_id: skin.id })), {
              onConflict: "skin_id,source,sort_order",
            });
          if (upsertError) throw upsertError;
        }
        done += 1;
      } catch (error) {
        failed += 1;
        failedSkins.push({ name: skin.name, message: error?.message ?? String(error) });
        console.warn(`Failed: ${skin.name}: ${error?.message ?? error}`);
      }
    }),
  );

  console.log(`Analyzed ${Math.min(i + concurrency, pending.length)}/${pending.length}`);
}

console.log(`Done. ${done} analyzed, ${failed} failed.`);
if (failedSkins.length) {
  console.log("Failed skins:");
  for (const item of failedSkins) console.log(`- ${item.name}: ${item.message}`);
  process.exitCode = 1;
}
