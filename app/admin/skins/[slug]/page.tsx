import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Palette, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ColorPalette } from "@/components/ColorPalette";
import { getAllSkinColors, getSkinBySlug, getSkinNotes, isCurrentUserAdmin } from "@/lib/data";
import { activePalette } from "@/lib/color";
import { addManualColorAction, addSkinNoteAction, analyzeColorsAction, clearManualPaletteAction, deleteColorAction, deleteSkinNoteAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export default async function AdminSkinPage({ params }: Props) {
  if (!(await isCurrentUserAdmin())) notFound();
  const { slug } = await params;
  const skin = await getSkinBySlug(slug);
  if (!skin) return notFound();
  const [colors, notes] = await Promise.all([getAllSkinColors(skin.id), getSkinNotes(skin.id)]);
  const autoColors = colors.filter((color) => color.source === "auto");
  const manualColors = colors.filter((color) => color.source === "manual");
  const active = activePalette(colors);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 md:pt-14">
      <Link href="/admin" className="interactive inline-flex items-center gap-2 text-xs text-zinc-600 transition hover:text-white"><ArrowLeft size={13}/> Admin</Link>
      <div className="mt-7 grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
        <aside className="space-y-5">
          <div className="glass-panel rounded-[30px] p-5"><div className="grid min-h-60 place-items-center rounded-[24px] bg-black/20 p-5" style={{ background: `radial-gradient(circle, ${skin.rarity_color ?? "#6ea8ff"}1f, transparent 66%)` }}>{skin.image_url ? <img src={skin.image_url} alt={skin.name} className="max-h-44 max-w-[94%] object-contain"/> : null}</div><div className="mt-5 text-[10px] font-semibold uppercase tracking-[.15em] text-zinc-600">{skin.weapon_name ?? skin.category}</div><h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] text-white">{skin.finish_name ?? skin.name}</h1><p className="mt-1 text-xs text-zinc-700">{skin.name}</p></div>
          <ColorPalette colors={active}/>
          <Link href={`/skins/${skin.slug}`} className="interactive block rounded-full border border-white/10 px-4 py-3 text-center text-xs font-semibold text-zinc-400 transition hover:bg-white/[.04] hover:text-white">View public skin page</Link>
        </aside>

        <div className="space-y-5">
          <section className="glass-panel rounded-[30px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-white"><Palette size={18} className="text-fuchsia-300"/><h2 className="font-semibold">Palette controls</h2></div><p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-600">Automatic colors come from image analysis. If at least one manual color exists, the manual palette becomes the public palette.</p></div>
              {skin.image_url ? <form action={analyzeColorsAction}><input type="hidden" name="skin_id" value={skin.id}/><input type="hidden" name="slug" value={skin.slug}/><button className="interactive inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[.05] hover:text-white"><RefreshCw size={13}/> Analyze image</button></form> : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-white/[.06] bg-black/15 p-4"><div className="mb-3 text-[9px] font-bold uppercase tracking-[.16em] text-zinc-600">Automatic</div><div className="space-y-2">{autoColors.length ? autoColors.map((color) => <div key={color.id} className="flex items-center gap-2 rounded-xl bg-white/[.025] p-2"><span className="size-7 rounded-lg border border-white/15" style={{background:color.hex}}/><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-zinc-300">{color.color_name}</div><div className="text-[9px] text-zinc-700">{color.hex} · {color.percentage}%</div></div><form action={deleteColorAction}><input type="hidden" name="id" value={color.id}/><input type="hidden" name="slug" value={skin.slug}/><button className="grid size-8 place-items-center text-zinc-700 hover:text-rose-300"><Trash2 size={13}/></button></form></div>) : <div className="text-xs text-zinc-700">Not analyzed yet.</div>}</div></div>
              <div className="rounded-[22px] border border-white/[.06] bg-black/15 p-4"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-zinc-600">Manual override</span>{manualColors.length ? <form action={clearManualPaletteAction}><input type="hidden" name="skin_id" value={skin.id}/><input type="hidden" name="slug" value={skin.slug}/><button className="text-[9px] font-semibold text-rose-300/70 hover:text-rose-300">Clear override</button></form> : null}</div><div className="space-y-2">{manualColors.length ? manualColors.map((color) => <div key={color.id} className="flex items-center gap-2 rounded-xl bg-white/[.025] p-2"><span className="size-7 rounded-lg border border-white/15" style={{background:color.hex}}/><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-zinc-300">{color.color_name}{color.is_primary ? <span className="ml-1 text-[8px] text-fuchsia-300">PRIMARY</span> : null}</div><div className="text-[9px] text-zinc-700">{color.hex} · {color.percentage}%</div></div><form action={deleteColorAction}><input type="hidden" name="id" value={color.id}/><input type="hidden" name="slug" value={skin.slug}/><button className="grid size-8 place-items-center text-zinc-700 hover:text-rose-300"><Trash2 size={13}/></button></form></div>) : <div className="text-xs text-zinc-700">No manual override. Automatic palette is active.</div>}</div></div>
            </div>

            <form action={addManualColorAction} className="mt-5 grid gap-3 rounded-[22px] border border-white/[.06] bg-white/[.018] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="skin_id" value={skin.id}/><input type="hidden" name="slug" value={skin.slug}/>
              <input name="hex" required placeholder="#7D42F5" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/>
              <input name="color_name" placeholder="Name (auto if empty)" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/>
              <input name="percentage" type="number" min="1" max="100" defaultValue="20" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/>
              <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-zinc-400"><input name="is_primary" type="checkbox"/> Primary</label>
              <button className="primary-button inline-flex h-11 items-center justify-center gap-2 rounded-full text-xs font-bold sm:col-span-2 lg:col-span-4"><Plus size={13}/> Add manual color</button>
            </form>
          </section>

          <section className="glass-panel rounded-[30px] p-6">
            <div><h2 className="font-semibold text-white">Skin insights</h2><p className="mt-2 text-xs leading-5 text-zinc-600">Use these for float behavior, special patterns, combo advice, rare variants and useful warnings.</p></div>
            <form action={addSkinNoteAction} className="mt-5 grid gap-3">
              <input type="hidden" name="skin_id" value={skin.id}/><input type="hidden" name="slug" value={skin.slug}/>
              <div className="grid gap-3 md:grid-cols-3"><select name="type" className="h-11 rounded-xl border border-white/10 bg-[#0c0e13] px-3 text-sm text-zinc-300"><option value="float_tip">Float tip</option><option value="pattern_tip">Pattern tip</option><option value="combo_tip">Combo tip</option><option value="rare_variant">Rare variant</option><option value="warning">Warning</option><option value="fun_fact">Fun fact</option></select><input name="title" required placeholder="e.g. Higher float = more orange" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20 md:col-span-2"/></div>
              <textarea name="content" required rows={4} placeholder="Explain the useful detail in one or two sentences…" className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-white/20"/>
              <div className="grid gap-3 sm:grid-cols-3"><input name="min_float" type="number" step="0.0001" min="0" max="1" placeholder="Min float (optional)" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/><input name="max_float" type="number" step="0.0001" min="0" max="1" placeholder="Max float (optional)" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/><input name="priority" type="number" defaultValue="0" placeholder="Priority" className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-white/20"/></div>
              <button className="primary-button inline-flex h-11 items-center justify-center gap-2 rounded-full text-xs font-bold"><Plus size={13}/> Add insight</button>
            </form>
            <div className="mt-6 space-y-2.5">{notes.length ? notes.map((note) => <article key={note.id} className="flex items-start gap-3 rounded-[18px] border border-white/[.06] bg-black/15 p-4"><div className="min-w-0 flex-1"><div className="text-[9px] font-bold uppercase tracking-[.14em] text-zinc-600">{note.type.replace("_", " ")} · priority {note.priority}</div><div className="mt-1 text-sm font-semibold text-white">{note.title}</div><p className="mt-1 text-xs leading-5 text-zinc-500">{note.content}</p></div><form action={deleteSkinNoteAction}><input type="hidden" name="id" value={note.id}/><input type="hidden" name="slug" value={skin.slug}/><button className="grid size-9 place-items-center rounded-full border border-white/[.06] text-zinc-700 transition hover:border-rose-300/20 hover:text-rose-300"><Trash2 size={14}/></button></form></article>) : <div className="rounded-[18px] border border-dashed border-white/8 p-8 text-center text-xs text-zinc-700">No insights added yet.</div>}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
