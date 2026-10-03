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
  if (s < 0.12) {
    if (l > 0.82) return "White";
    if (l > 0.62) return "Silver";
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

const NEUTRAL_FAMILIES = new Set<ColorFamily>(["Black", "White", "Silver", "Gray"]);

function isNeutralColor(color: SkinColor) {
  return NEUTRAL_FAMILIES.has(color.color_name as ColorFamily);
}

function chromaticShare(palette: SkinColor[]) {
  const total = palette.reduce((sum, color) => sum + Math.max(1, color.percentage ?? 1), 0) || 1;
  return palette
    .filter((color) => !isNeutralColor(color))
    .reduce((sum, color) => sum + Math.max(1, color.percentage ?? 1), 0) / total;
}

function effectiveWeight(color: SkinColor, paletteHasAccents: boolean) {
  const base = Math.max(1, color.percentage ?? 1);
  if (!paletteHasAccents) return base;

  if (!isNeutralColor(color)) {
    return base * (color.is_primary ? 2.15 : 1.75);
  }

  switch (color.color_name) {
    case "White":
      return base * 0.58;
    case "Black":
      return base * 0.42;
    case "Silver":
      return base * 0.32;
    case "Gray":
    default:
      return base * 0.24;
  }
}

function weightedSideScore(source: SkinColor[], target: SkinColor[]) {
  if (!source.length || !target.length) return 0;
  const hasAccents = chromaticShare(source) >= 0.08;
  const weights = source.map((color) => effectiveWeight(color, hasAccents));
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;

  return source.reduce((sum, color, index) => {
    const nearest = Math.min(...target.map((other) => deltaE(color.hex, other.hex)));
    const similarity = Math.exp(-nearest / 32);
    return sum + similarity * (weights[index] / total);
  }, 0);
}

function accentSideScore(source: SkinColor[], target: SkinColor[]) {
  const sourceAccents = source.filter((color) => !isNeutralColor(color));
  const targetAccents = target.filter((color) => !isNeutralColor(color));
  if (!sourceAccents.length || !targetAccents.length) return 0;

  const total = sourceAccents.reduce((sum, color) => sum + Math.max(1, color.percentage ?? 1), 0) || 1;
  return sourceAccents.reduce((sum, color) => {
    const nearest = Math.min(...targetAccents.map((other) => deltaE(color.hex, other.hex)));
    const similarity = Math.exp(-nearest / 24);
    const weight = Math.max(1, color.percentage ?? 1) / total;
    return sum + similarity * weight;
  }, 0);
}

function strongestAccent(palette: SkinColor[]) {
  return [...palette]
    .filter((color) => !isNeutralColor(color))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (b.percentage ?? 0) - (a.percentage ?? 0))[0];
}

export function paletteMatchScore(left: SkinColor[], right: SkinColor[]) {
  if (!left.length || !right.length) return 0;

  const fullPerceptual = (weightedSideScore(left, right) + weightedSideScore(right, left)) / 2;
  const leftChromaticShare = chromaticShare(left);
  const rightChromaticShare = chromaticShare(right);
  const accentRelevant = Math.max(leftChromaticShare, rightChromaticShare) >= 0.1;

  let score = fullPerceptual;
  if (accentRelevant) {
    const accent = (accentSideScore(left, right) + accentSideScore(right, left)) / 2;
    score = fullPerceptual * 0.34 + accent * 0.66;

    // A vivid loadout should not rank a mostly neutral item highly just because
    // both renders contain gray/black surfaces.
    const oneSideLacksAccents =
      (leftChromaticShare >= 0.16 && rightChromaticShare < 0.055) ||
      (rightChromaticShare >= 0.16 && leftChromaticShare < 0.055);
    if (oneSideLacksAccents) score *= 0.72;
  }

  const leftAccent = strongestAccent(left);
  const rightAccent = strongestAccent(right);
  if (leftAccent && rightAccent) {
    const accentDistance = deltaE(leftAccent.hex, rightAccent.hex);
    if (leftAccent.color_name === rightAccent.color_name) score += 0.06;
    else if (accentDistance <= 18) score += 0.035;
    else if (accentDistance >= 52) score *= 0.9;
  }

  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

export function activePalette(colors: SkinColor[]) {
  const manual = colors.filter((color) => color.source === "manual");
  const active = manual.length ? manual : colors.filter((color) => color.source === "auto");
  return [...active].sort((a, b) => a.sort_order - b.sort_order || Number(b.is_primary) - Number(a.is_primary));
}
