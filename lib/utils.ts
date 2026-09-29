export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatPrice(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function pct(part: number, total: number) {
  if (!total) return 50;
  return Math.round((part / total) * 100);
}

export function approvalPct(likes: number, dislikes: number) {
  const total = likes + dislikes;
  if (!total) return 50;
  return Math.round((likes / total) * 100);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
