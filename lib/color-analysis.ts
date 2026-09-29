import "server-only";
import sharp from "sharp";
import { getColorFamily } from "@/lib/color";

export type AnalyzedColor = {
  hex: string;
  percentage: number;
  color_name: string;
  is_primary: boolean;
  sort_order: number;
};

type Bucket = { r: number; g: number; b: number; weight: number };

function distance(a: Bucket, b: Bucket) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function toHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0").toUpperCase();
}

export async function analyzeSkinImage(imageUrl: string): Promise<AnalyzedColor[]> {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not download skin image (${response.status})`);
  const input = Buffer.from(await response.arrayBuffer());

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize({ width: 112, height: 112, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, { r: number; g: number; b: number; weight: number; count: number }>();
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

    const qr = Math.round(r / step) * step;
    const qg = Math.round(g / step) * step;
    const qb = Math.round(b / step) * step;
    const key = `${qr},${qg},${qb}`;
    const alphaWeight = a / 255;
    const edgePenalty = brightness < 14 ? 0.55 : 1;
    const weight = alphaWeight * edgePenalty;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0, count: 0 };
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    bucket.weight += weight;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const ranked: Bucket[] = [...buckets.values()]
    .filter((bucket) => bucket.weight > 0)
    .map((bucket) => ({ r: bucket.r / bucket.weight, g: bucket.g / bucket.weight, b: bucket.b / bucket.weight, weight: bucket.weight }))
    .sort((a, b) => b.weight - a.weight);

  const picked: Bucket[] = [];
  for (const bucket of ranked) {
    if (picked.every((selected) => distance(bucket, selected) >= 46)) picked.push(bucket);
    if (picked.length >= 5) break;
  }
  if (picked.length < 3) {
    for (const bucket of ranked) {
      if (!picked.includes(bucket)) picked.push(bucket);
      if (picked.length >= 5) break;
    }
  }

  const total = picked.reduce((sum, bucket) => sum + bucket.weight, 0) || 1;
  let allocated = 0;
  return picked.map((bucket, index) => {
    const hex = `#${toHex(bucket.r)}${toHex(bucket.g)}${toHex(bucket.b)}`;
    const percentage = index === picked.length - 1
      ? Math.max(1, 100 - allocated)
      : Math.max(1, Math.floor((bucket.weight / total) * 100));
    allocated += percentage;
    return {
      hex,
      percentage,
      color_name: getColorFamily(hex),
      is_primary: index === 0,
      sort_order: index,
    };
  });
}
