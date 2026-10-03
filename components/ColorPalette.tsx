import { Palette } from "lucide-react";
import type { SkinColor } from "@/lib/types";

export function ColorPalette({ colors, compact = false }: { colors: SkinColor[]; compact?: boolean }) {
  if (!colors.length) {
    return compact ? <span className="text-zinc-500">Not analyzed</span> : null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={colors.map((color) => color.color_name).join(", ")}>
        {colors.slice(0, 5).map((color) => (
          <span key={color.id} className="size-4 rounded-full border border-white/15 shadow-[0_2px_7px_rgba(0,0,0,.35)]" style={{ background: color.hex }} />
        ))}
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[30px] p-6">
      <div className="flex items-center gap-2 text-white"><Palette size={18} className="text-fuchsia-300"/><h2 className="font-semibold">Color palette</h2></div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">Visually dominant colors detected from the skin image. Percentages represent visual weight, not raw pixel area. Manual admin palettes override automatic detection.</p>
      <div className="mt-5 overflow-hidden rounded-[18px] border border-white/[.07] bg-black/20">
        <div className="flex h-16 w-full">
          {colors.map((color) => (
            <div key={color.id} className="h-full min-w-6" style={{ background: color.hex, flexGrow: Math.max(5, color.percentage ?? 1) }} title={`${color.color_name} · ${color.percentage ?? 0}% · ${color.hex}`} />
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {colors.map((color) => (
          <div key={color.id} className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] px-3 py-2.5">
            <span className="size-7 shrink-0 rounded-xl border border-white/15" style={{ background: color.hex }} />
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-zinc-300">{color.color_name}{color.is_primary ? <span className="ml-1 text-[9px] uppercase tracking-[.1em] text-fuchsia-300">Primary</span> : null}</div><div className="mt-0.5 text-[10px] text-zinc-500">{color.hex} · {color.percentage ?? 0}%</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
