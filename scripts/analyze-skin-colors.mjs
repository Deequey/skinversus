import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const targetSlug = slugArg ? slugArg.slice("--slug=".length).trim() : "";
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
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function rgbStats(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  return {
    saturation: max <= 0.0001 ? 0 : chroma / max,
    lightness: (max + min) / 2,
  };
}

function detectItemKind(context) {
  const haystack = `${context?.name ?? ""} ${context?.weapon_name ?? ""} ${context?.category ?? ""}`.toLowerCase();
  if (haystack.includes("glove")) return "glove";
  if (
    haystack.includes("knife") ||
    haystack.includes("bayonet") ||
    haystack.includes("karambit") ||
    haystack.includes("dagger") ||
    haystack.includes("kukri")
  ) return "knife";
  return "other";
}

function neutralBase(vividRatio, kind) {
  if (vividRatio < 0.05) return 0.9;
  if (vividRatio < 0.12) return kind === "glove" ? 0.42 : kind === "knife" ? 0.48 : 0.55;
  if (vividRatio < 0.28) return kind === "glove" ? 0.22 : kind === "knife" ? 0.3 : 0.38;
  return kind === "glove" ? 0.16 : kind === "knife" ? 0.24 : 0.3;
}

function visualWeight(sample, vividRatio, kind) {
  const alphaWeight = sample.a / 255;
  const baseNeutral = neutralBase(vividRatio, kind);
  const chromaMix = smoothstep(0.08, 0.3, sample.saturation);
  let neutralFactor = baseNeutral + (1 - baseNeutral) * chromaMix;

  if (sample.saturation < 0.14 && sample.lightness < 0.16) {
    neutralFactor = Math.max(neutralFactor, kind === "glove" ? 0.36 : 0.42);
  }
  if (sample.saturation < 0.12 && sample.lightness > 0.82) {
    neutralFactor = Math.max(neutralFactor, 0.34);
  }

  const saturationBoost = 0.9 + 2.6 * Math.pow(sample.saturation, 1.35);
  const extremeLightPenalty = sample.lightness < 0.04 ? 0.5 : sample.lightness > 0.96 ? 0.62 : 1;
  return alphaWeight * neutralFactor * saturationBoost * extremeLightPenalty;
}

function bucketHex(bucket) {
  return `#${hexByte(bucket.r)}${hexByte(bucket.g)}${hexByte(bucket.b)}`;
}

function mergeBuckets(entries) {
  const clusters = [];

  for (const entry of entries) {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const entryFamily = family(bucketHex(entry));

    for (let i = 0; i < clusters.length; i += 1) {
      const clusterFamily = family(bucketHex(clusters[i]));
      const bothNeutral = ["Gray", "Silver", "White"].includes(entryFamily) && ["Gray", "Silver", "White"].includes(clusterFamily);
      const threshold = bothNeutral ? 62 : 42;
      const d = dist(entry, clusters[i]);
      if (d < threshold && d < nearestDistance) {
        nearestDistance = d;
        nearestIndex = i;
      }
    }

    if (nearestIndex === -1) {
      clusters.push({ ...entry });
      continue;
    }

    const current = clusters[nearestIndex];
    const combinedArea = current.area + entry.area;
    const combinedScore = current.score + entry.score;
    current.r = (current.r * current.area + entry.r * entry.area) / Math.max(0.0001, combinedArea);
    current.g = (current.g * current.area + entry.g * entry.area) / Math.max(0.0001, combinedArea);
    current.b = (current.b * current.area + entry.b * entry.area) / Math.max(0.0001, combinedArea);
    current.saturation = (current.saturation * current.score + entry.saturation * entry.score) / Math.max(0.0001, combinedScore);
    current.lightness = (current.lightness * current.score + entry.lightness * entry.score) / Math.max(0.0001, combinedScore);
    current.area = combinedArea;
    current.score = combinedScore;
  }

  return clusters.sort((a, b) => b.score - a.score);
}

function normalizePercentages(scores) {
  if (!scores.length) return [];
  const total = scores.reduce((sum, score) => sum + score, 0) || 1;
  const exact = scores.map((score) => (score / total) * 100);
  const rounded = exact.map((value) => Math.max(1, Math.floor(value)));
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  let cursor = 0;
  while (remaining > 0 && order.length) {
    rounded[order[cursor % order.length].index] += 1;
    remaining -= 1;
    cursor += 1;
  }
  while (remaining < 0) {
    const index = rounded.findIndex((value) => value > 1);
    if (index === -1) break;
    rounded[index] -= 1;
    remaining += 1;
  }
  return rounded;
}

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

async function analyze(imageUrl, context = {}) {
  const input = await downloadImage(imageUrl);
  const kind = detectItemKind(context);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const samples = [];
  let objectArea = 0;
  let vividArea = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;
    if (a < 72) continue;

    const { saturation, lightness } = rgbStats(r, g, b);
    if (lightness > 0.965 && saturation < 0.035) continue;

    const alphaWeight = a / 255;
    objectArea += alphaWeight;
    if (saturation >= 0.22 && lightness >= 0.07 && lightness <= 0.94) vividArea += alphaWeight;
    samples.push({ r, g, b, a, saturation, lightness });
  }

  if (!samples.length) throw new Error("no usable pixels found");

  const vividRatio = vividArea / Math.max(1, objectArea);
  const buckets = new Map();
  const step = 24;

  for (const sample of samples) {
    const score = visualWeight(sample, vividRatio, kind);
    const area = sample.a / 255;
    const key = `${Math.round(sample.r / step)},${Math.round(sample.g / step)},${Math.round(sample.b / step)}`;
    const current = buckets.get(key) ?? { r: 0, g: 0, b: 0, score: 0, area: 0, saturation: 0, lightness: 0 };
    current.r += sample.r * area;
    current.g += sample.g * area;
    current.b += sample.b * area;
    current.score += score;
    current.area += area;
    current.saturation += sample.saturation * score;
    current.lightness += sample.lightness * score;
    buckets.set(key, current);
  }

  const ranked = [...buckets.values()]
    .filter((entry) => entry.score > 0 && entry.area > 0)
    .map((entry) => ({
      r: entry.r / entry.area,
      g: entry.g / entry.area,
      b: entry.b / entry.area,
      score: entry.score,
      area: entry.area,
      saturation: entry.saturation / entry.score,
      lightness: entry.lightness / entry.score,
    }))
    .sort((a, b) => b.score - a.score);

  const clusters = mergeBuckets(ranked);
  const picked = [];

  for (const cluster of clusters) {
    const colorFamily = family(bucketHex(cluster));
    const tooSimilar = picked.some((selected) => {
      const selectedFamily = family(bucketHex(selected));
      const bothNeutral = ["Gray", "Silver", "White"].includes(colorFamily) && ["Gray", "Silver", "White"].includes(selectedFamily);
      return dist(cluster, selected) < (bothNeutral ? 72 : 38);
    });
    if (!tooSimilar) picked.push(cluster);
    if (picked.length >= 5) break;
  }

  if (!picked.length) throw new Error("no usable color clusters found");
  const percentages = normalizePercentages(picked.map((entry) => entry.score));

  return picked.map((entry, index) => {
    const hex = bucketHex(entry);
    return {
      hex,
      percentage: percentages[index],
      color_name: family(hex),
      is_primary: index === 0,
      source: "auto",
      sort_order: index,
    };
  });
}

async function fetchSkins() {
  if (targetSlug) {
    const { data, error } = await supabase
      .from("skins")
      .select("id,slug,name,weapon_name,category,image_url")
      .eq("slug", targetSlug)
      .not("image_url", "is", null)
      .limit(1);
    if (error) throw error;
    return data ?? [];
  }

  const skins = [];
  let from = 0;

  while (skins.length < requestedLimit) {
    const remaining = Number.isFinite(requestedLimit) ? requestedLimit - skins.length : PAGE_SIZE;
    const pageSize = Math.min(PAGE_SIZE, remaining);
    if (pageSize <= 0) break;

    const { data, error } = await supabase
      .from("skins")
      .select("id,slug,name,weapon_name,category,image_url")
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

console.log(`Found ${skins.length} skins with images.${targetSlug ? ` Target slug: ${targetSlug}.` : ""}`);
console.log(`Color analysis: ${pending.length} pending (${existing.size} already analyzed, force=${force})`);
console.log("Scoring mode: perceptual visual weight (saturated finish colors are prioritized over neutral render surfaces).");

let done = 0;
let failed = 0;
const failedSkins = [];

for (let i = 0; i < pending.length; i += concurrency) {
  await Promise.all(
    pending.slice(i, i + concurrency).map(async (skin) => {
      try {
        const colors = await analyze(skin.image_url, skin);
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
