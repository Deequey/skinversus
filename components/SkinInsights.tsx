import { AlertTriangle, CircleDot, Info, Lightbulb, Sparkles, Swords, Waves } from "lucide-react";
import type { SkinNote, SkinNoteType } from "@/lib/types";

const noteMeta: Record<SkinNoteType, { label: string; icon: typeof Lightbulb; tone: string }> = {
  float_tip: { label: "Float tip", icon: Waves, tone: "text-cyan-300" },
  pattern_tip: { label: "Pattern tip", icon: CircleDot, tone: "text-violet-300" },
  combo_tip: { label: "Combo tip", icon: Swords, tone: "text-emerald-300" },
  rare_variant: { label: "Rare variant", icon: Sparkles, tone: "text-amber-300" },
  warning: { label: "Worth knowing", icon: AlertTriangle, tone: "text-rose-300" },
  fun_fact: { label: "Skin fact", icon: Info, tone: "text-blue-300" },
};

function floatRange(note: SkinNote) {
  if (note.min_float == null && note.max_float == null) return null;
  return `${note.min_float?.toFixed(2) ?? "min"} – ${note.max_float?.toFixed(2) ?? "max"} float`;
}

export function SkinInsights({ notes }: { notes: SkinNote[] }) {
  if (!notes.length) return null;
  return (
    <section className="glass-panel rounded-[30px] p-6">
      <div className="flex items-center gap-2 text-white"><Lightbulb size={18} className="text-amber-300"/><h2 className="font-semibold">Skin insights</h2></div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">Useful details that are easy to miss when you only look at the market image.</p>
      <div className="mt-5 space-y-2.5">
        {notes.map((note) => {
          const meta = noteMeta[note.type];
          const Icon = meta.icon;
          const range = floatRange(note);
          return (
            <article key={note.id} className="rounded-[20px] border border-white/[.065] bg-black/15 p-4">
              <div className="flex gap-3">
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.025] ${meta.tone}`}><Icon size={15}/></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className={`text-[9px] font-bold uppercase tracking-[.16em] ${meta.tone}`}>{meta.label}</span>{range ? <span className="rounded-full border border-white/[.07] px-2 py-0.5 text-[9px] text-zinc-600">{range}</span> : null}</div>
                  <h3 className="mt-1.5 text-sm font-semibold text-white">{note.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{note.content}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
