import "server-only";
import sharp from "sharp";
import { getColorFamily, type ColorFamily } from "@/lib/color";

export type AnalyzedColor = {
  hex: string;
  percentage: number;
  color_name: string;
  is_primary: boolean;
  sort_order: number;
};

export type ColorAnalysisContext = {
  name?: string | null;
  weapon_name?: string | null;
  category?: string | null;
};

type ItemKind = "glove" | "knife" | "other";

type PixelSample = {
  r: number;
  g: number;
  b: number;
  a: number;
  saturation: number;
  lightness: number;
};

type Bucket = {
  r: number;
  g: number;
  b: number;
  score: number;
  area: number;
  saturation: number;
  lightness: number;
};

type RankedCluster = Bucket & {
  family: ColorFamily;
  areaShare: number;
  salienceShare: number;
  combined: number;
};

const NEUTRAL_FAMILIES = new Set<ColorFamily>(["Black", "White", "Silver", "Gray"]);

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function rgbStats(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const chroma = max - min;
  const saturation = max <= 0.0001 ? 0 : chroma / max;
  const lightness = (max + min) / 2;
  return { saturation, lightness };
}

function detectItemKind(context: ColorAnalysisContext): ItemKind {
  const haystack = `${context.name ?? ""} ${context.weapon_name ?? ""} ${context.category ?? ""}`.toLowerCase();
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

function neutralBase(vividRatio: number, kind: ItemKind) {
  if (vividRatio < 0.05) return 0.9;
  if (vividRatio < 0.12) {
    if (kind === "glove") return 0.42;
    if (kind === "knife") return 0.48;
    return 0.55;
  }
  if (vividRatio < 0.28) {
    if (kind === "glove") return 0.22;
    if (kind === "knife") return 0.3;
    return 0.38;
  }
  if (kind === "glove") return 0.16;
  if (kind === "knife") return 0.24;
  return 0.3;
}

function visualWeight(sample: PixelSample, vividRatio: number, kind: ItemKind) {
  const alphaWeight = sample.a / 255;
  const baseNeutral = neutralBase(vividRatio, kind);
  const chromaMix = smoothstep(0.08, 0.3, sample.saturation);
  let neutralFactor = baseNeutral + (1 - baseNeutral) * chromaMix;

  // Black remains useful for loadout matching, while mid-gray render surfaces
  // are deliberately weaker when the finish has a vivid identity.
  if (sample.saturation < 0.14 && sample.lightness < 0.16) {
    neutralFactor = Math.max(neutralFactor, kind === "glove" ? 0.36 : 0.42);
  }

  // White paint is a real design color (e.g. Asiimov/Printstream), not render
  // noise. Keep enough salience for it to survive beside a saturated accent.
  if (sample.saturation < 0.12 && sample.lightness > 0.78) {
    neutralFactor = Math.max(neutralFactor, kind === "glove" ? 0.34 : 0.48);
  }

  const saturationBoost = 0.9 + 2.6 * Math.pow(sample.saturation, 1.35);
  const extremeDarkPenalty = sample.lightness < 0.035 ? 0.52 : 1;
  return alphaWeight * neutralFactor * saturationBoost * extremeDarkPenalty;
}

function distance(a: Pick<Bucket, "r" | "g" | "b">, b: Pick<Bucket, "r" | "g" | "b">) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function toHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0").toUpperCase();
}

function bucketHex(bucket: Pick<Bucket, "r" | "g" | "b">) {
  return `#${toHex(bucket.r)}${toHex(bucket.g)}${toHex(bucket.b)}`;
}

function mergeBuckets(entries: Bucket[]) {
  const clusters: Bucket[] = [];

  for (const entry of entries) {
    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const entryFamily = getColorFamily(bucketHex(entry));

    for (let i = 0; i < clusters.length; i += 1) {
      const clusterFamily = getColorFamily(bucketHex(clusters[i]));
      const sameFamily = entryFamily === clusterFamily;
      const entryNeutral = NEUTRAL_FAMILIES.has(entryFamily);
      const clusterNeutral = NEUTRAL_FAMILIES.has(clusterFamily);

      // Do not blend White into Gray/Silver. That was the reason large white
      // painted regions could disappear from the final palette.
      if (entryNeutral && clusterNeutral && !sameFamily) continue;

      const threshold = sameFamily ? (entryNeutral ? 54 : 46) : 26;
      const d = distance(entry, clusters[i]);
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

  return clusters;
}

function rankClusters(clusters: Bucket[], vividRatio: number): RankedCluster[] {
  const totalArea = clusters.reduce((sum, cluster) => sum + cluster.area, 0) || 1;
  const totalScore = clusters.reduce((sum, cluster) => sum + cluster.score, 0) || 1;

  return clusters
    .map((cluster) => {
      const family = getColorFamily(bucketHex(cluster));
      const areaShare = cluster.area / totalArea;
      const salienceShare = cluster.score / totalScore;
      let combined: number;

      if (family === "White" || family === "Silver") {
        combined = salienceShare * 0.54 + areaShare * 0.46;
        if (areaShare >= 0.12) combined += 0.025;
      } else if (family === "Gray") {
        combined = vividRatio >= 0.08
          ? salienceShare * 0.8 + areaShare * 0.2
          : salienceShare * 0.58 + areaShare * 0.42;
      } else if (family === "Black") {
        combined = vividRatio >= 0.08
          ? salienceShare * 0.72 + areaShare * 0.28
          : salienceShare * 0.55 + areaShare * 0.45;
      } else {
        combined = salienceShare * 0.76 + areaShare * 0.24;
      }

      return { ...cluster, family, areaShare, salienceShare, combined };
    })
    .sort((a, b) => b.combined - a.combined);
}

function tooSimilar(candidate: RankedCluster, selected: RankedCluster[]) {
  return selected.some((other) => {
    if (candidate.family === other.family) return distance(candidate, other) < (NEUTRAL_FAMILIES.has(candidate.family) ? 54 : 40);
    return distance(candidate, other) < 22;
  });
}

function pickPalette(clusters: RankedCluster[], vividRatio: number) {
  const picked: RankedCluster[] = [];
  const add = (candidate: RankedCluster | undefined) => {
    if (!candidate || picked.includes(candidate) || tooSimilar(candidate, picked) || picked.length >= 5) return;
    picked.push(candidate);
  };

  // Reserve slots for visually defining accent families. This prevents glove
  // palms / gray metal from pushing a small but unmistakable pink/blue accent
  // out of a five-color palette.
  if (vividRatio >= 0.035) {
    const accentFamilies = new Set<ColorFamily>();
    for (const candidate of clusters) {
      if (NEUTRAL_FAMILIES.has(candidate.family)) continue;
      if (candidate.salienceShare < 0.018 && candidate.areaShare < 0.006) continue;
      if (accentFamilies.has(candidate.family)) continue;
      add(candidate);
      accentFamilies.add(candidate.family);
      if (accentFamilies.size >= 3 || picked.length >= 3) break;
    }
  }

  // Coverage matters too. Preserve a genuinely large white/silver/black/gray
  // region even when a vivid accent is intentionally made primary.
  const coverageNeutrals = clusters
    .filter((candidate) => NEUTRAL_FAMILIES.has(candidate.family) && candidate.areaShare >= 0.075)
    .sort((a, b) => b.areaShare - a.areaShare);
  for (const candidate of coverageNeutrals.slice(0, 2)) add(candidate);

  for (const candidate of clusters) {
    add(candidate);
    if (picked.length >= 5) break;
  }

  if (!picked.length) return [];

  const strongestAccent = picked
    .filter((candidate) => !NEUTRAL_FAMILIES.has(candidate.family))
    .sort((a, b) => b.salienceShare - a.salienceShare)[0];
  const primary = strongestAccent && vividRatio >= 0.035 ? strongestAccent : [...picked].sort((a, b) => b.combined - a.combined)[0];

  return [primary, ...picked.filter((candidate) => candidate !== primary).sort((a, b) => b.combined - a.combined)];
}

function normalizePercentages(scores: number[]) {
  if (!scores.length) return [];
  const total = scores.reduce((sum, score) => sum + score, 0) || 1;
  const exact = scores.map((score) => (score / total) * 100);
  const rounded = exact.map((value) => Math.max(1, Math.floor(value)));
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);

  const remainderOrder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  let cursor = 0;
  while (remaining > 0 && remainderOrder.length) {
    rounded[remainderOrder[cursor % remainderOrder.length].index] += 1;
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

export async function analyzeSkinImage(imageUrl: string, context: ColorAnalysisContext = {}): Promise<AnalyzedColor[]> {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not download skin image (${response.status})`);
  const input = Buffer.from(await response.arrayBuffer());
  const kind = detectItemKind(context);

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize({ width: 176, height: 176, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const samples: PixelSample[] = [];
  let objectArea = 0;
  let vividArea = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;
    if (a < 72) continue;

    const { saturation, lightness } = rgbStats(r, g, b);

    // The source renders have transparent backgrounds, so opaque white pixels
    // are part of the skin and must not be discarded.
    const alphaWeight = a / 255;
    objectArea += alphaWeight;
    if (saturation >= 0.2 && lightness >= 0.06 && lightness <= 0.96) vividArea += alphaWeight;
    samples.push({ r, g, b, a, saturation, lightness });
  }

  if (!samples.length) return [];
  const vividRatio = vividArea / Math.max(1, objectArea);
  const buckets = new Map<string, { r: number; g: number; b: number; score: number; area: number; saturation: number; lightness: number }>();
  const step = 22;

  for (const sample of samples) {
    const score = visualWeight(sample, vividRatio, kind);
    const area = sample.a / 255;
    const qr = Math.round(sample.r / step) * step;
    const qg = Math.round(sample.g / step) * step;
    const qb = Math.round(sample.b / step) * step;
    const key = `${qr},${qg},${qb}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, score: 0, area: 0, saturation: 0, lightness: 0 };

    bucket.r += sample.r * area;
    bucket.g += sample.g * area;
    bucket.b += sample.b * area;
    bucket.score += score;
    bucket.area += area;
    bucket.saturation += sample.saturation * score;
    bucket.lightness += sample.lightness * score;
    buckets.set(key, bucket);
  }

  const ranked: Bucket[] = [...buckets.values()]
    .filter((bucket) => bucket.score > 0 && bucket.area > 0)
    .map((bucket) => ({
      r: bucket.r / bucket.area,
      g: bucket.g / bucket.area,
      b: bucket.b / bucket.area,
      score: bucket.score,
      area: bucket.area,
      saturation: bucket.saturation / bucket.score,
      lightness: bucket.lightness / bucket.score,
    }));

  const clusters = rankClusters(mergeBuckets(ranked), vividRatio);
  const picked = pickPalette(clusters, vividRatio);
  if (!picked.length) return [];

  const percentages = normalizePercentages(picked.map((cluster) => cluster.combined));
  return picked.map((cluster, index) => {
    const hex = bucketHex(cluster);
    return {
      hex,
      percentage: percentages[index],
      color_name: getColorFamily(hex),
      is_primary: index === 0,
      sort_order: index,
    };
  });
}
