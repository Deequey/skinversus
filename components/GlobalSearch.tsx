"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SkinSearch } from "@/components/SkinSearch";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="interactive hidden h-9 items-center gap-2 rounded-full border border-white/[.075] bg-white/[.035] px-3 text-xs text-zinc-500 transition hover:border-white/15 hover:bg-white/[.06] hover:text-zinc-200 sm:flex"
      >
        <Search size={14} />
        <span>Search</span>
        <span className="ml-2 rounded-md border border-white/[.07] bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-zinc-600">⌘K</span>
      </button>

      <button type="button" onClick={() => setOpen(true)} className="interactive grid size-9 place-items-center rounded-full border border-white/[.075] bg-white/[.035] text-zinc-400 sm:hidden" aria-label="Search skins">
        <Search size={16} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-xl" onMouseDown={() => setOpen(false)}>
          <div className="modal-in relative w-full max-w-2xl rounded-[30px] border border-white/12 bg-[#0d0f14]/98 p-4 shadow-[0_60px_180px_rgba(0,0,0,.8)] md:p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between px-1">
              <div>
                <div className="text-xs font-semibold text-white">Search SkinVersus</div>
                <div className="mt-1 text-[11px] text-zinc-600">Weapon + finish, in any order.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="interactive grid size-9 place-items-center rounded-full border border-white/8 text-zinc-500 transition hover:bg-white/5 hover:text-white" aria-label="Close search"><X size={16} /></button>
            </div>
            <SkinSearch
              label="Find any CS2 skin"
              value={null}
              onChange={(skin) => {
                if (!skin) return;
                setOpen(false);
                router.push(`/skins/${skin.slug}`);
              }}
              hint="deagle printstream · m9 doppler · tiger tooth talon"
              placeholder="Search any skin…"
            />
            <div className="mt-4 flex items-center justify-between px-1 text-[10px] text-zinc-700">
              <span>↑↓ navigate · Enter open</span><span>Esc close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
