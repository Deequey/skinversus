import type { SkinColor } from "@/lib/types";

const COLOR_FAMILIES = [
  "Black", "White", "Silver", "Gray", "Brown", "Tan", "Red", "Burgundy", "Orange", "Gold",
  "Yellow", "Lime", "Green", "Emerald", "Teal", "Cyan", "Blue", "Navy", "Purple", "Pink",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function normalizeHex(hex: string) {
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean)) return `#${clean.split("").map((c) => c + c).join("").toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(clean)) return `#${clean.toUpperCase()}`;
  return "#808080";
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

export function getColorFamily(hex: string): ColorFamily {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  if (l < 0.13) return "Black";
  if (l > 0.9 && s < 0.12) return "White";
  if (s < 0.11) {
    if (l > 0.68) return "Silver";
    return "Gray";
  }

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

function srgbToLinear(value: number) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function rgbToLab(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE(hexA: string, hexB: string) {
  const a = rgbToLab(hexA);
  const b = rgbToLab(hexB);
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

function weightedSideScore(source: SkinColor[], target: SkinColor[]) {
  if (!source.length || !target.length) return 0;
  const total = source.reduce((sum, color) => sum + Math.max(1, color.percentage ?? 1), 0);
  return source.reduce((sum, color) => {
    const nearest = Math.min(...target.map((other) => deltaE(color.hex, other.hex)));
    const similarity = Math.exp(-nearest / 34);
    const weight = Math.max(1, color.percentage ?? 1) / total;
    return sum + similarity * weight;
  }, 0);
}

export function paletteMatchScore(left: SkinColor[], right: SkinColor[]) {
  if (!left.length || !right.length) return 0;
  const perceptual = (weightedSideScore(left, right) + weightedSideScore(right, left)) / 2;
  const leftPrimary = left.find((color) => color.is_primary) ?? left[0];
  const rightPrimary = right.find((color) => color.is_primary) ?? right[0];
  const sameFamily = leftPrimary && rightPrimary && leftPrimary.color_name === rightPrimary.color_name;
  const boosted = Math.min(1, perceptual + (sameFamily ? 0.055 : 0));
  return Math.round(boosted * 100);
}

export function activePalette(colors: SkinColor[]) {
  const manual = colors.filter((color) => color.source === "manual");
  const active = manual.length ? manual : colors.filter((color) => color.source === "auto");
  return [...active].sort((a, b) => a.sort_order - b.sort_order || Number(b.is_primary) - Number(a.is_primary));
}
