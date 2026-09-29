"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SkinSearch } from "@/components/SkinSearch";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [shortcut, setShortcut] = useState("Ctrl");

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    setShortcut(isMac ? "⌘" : "Ctrl");

    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setFocusRequest((value) => value + 1);
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

  function openSearch() {
    setOpen(true);
    setFocusRequest((value) => value + 1);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="search-trigger interactive hidden h-10 min-w-[210px] items-center gap-2.5 rounded-full px-3.5 text-xs sm:flex"
        aria-label="Search skins"
      >
        <Search size={15} className="text-blue-300" />
        <span className="text-zinc-300">Search skins</span>
        <span className="ml-auto flex items-center gap-1">
          <kbd className="search-key">{shortcut}</kbd>
          <kbd className="search-key">K</kbd>
        </span>
      </button>

      <button type="button" onClick={openSearch} className="header-action interactive grid size-10 place-items-center rounded-full text-zinc-200 sm:hidden" aria-label="Search skins">
        <Search size={16} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#05060a]/78 px-4 pt-[10vh] backdrop-blur-2xl" onMouseDown={() => setOpen(false)}>
          <div className="search-modal modal-in relative w-full max-w-2xl rounded-[30px] p-4 md:p-5" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-5 px-1">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white"><Search size={15} className="text-blue-300" /> Search SkinVersus</div>
                <div className="mt-1 text-[11px] text-zinc-400">Type a weapon, finish, or both. Results update instantly.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="header-action interactive grid size-9 place-items-center rounded-full text-zinc-300" aria-label="Close search"><X size={16} /></button>
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
              autoFocus
              focusRequest={focusRequest}
            />
            <div className="mt-4 flex items-center justify-between px-1 text-[10px] text-zinc-500">
              <span>↑↓ navigate · Enter open</span><span>Esc close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
