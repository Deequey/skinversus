"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Skin } from "@/lib/types";

export function SkinSearch({
  label,
  value,
  onChange,
  placeholder = "Search weapon, finish or both…",
  hint = "Try “tiger tooth talon”",
  autoFocus = false,
  focusRequest = 0,
}: {
  label: string;
  value: Skin | null;
  onChange: (skin: Skin | null) => void;
  placeholder?: string;
  hint?: string | null;
  autoFocus?: boolean;
  focusRequest?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Skin[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {
    if (!autoFocus || value) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, focusRequest, value]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const clean = query.trim();
    if (clean.length < 2 || value) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skins?q=${encodeURIComponent(clean)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search unavailable");
        const json = await res.json();
        setResults(json.items ?? []);
        setActiveIndex(0);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Could not search skins. Check your Supabase connection.");
      } finally {
        setLoading(false);
      }
    }, 130);

    return () => {
      controller.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, value]);

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-result-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function choose(skin: Skin) {
    onChange(skin);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2.5 flex min-h-4 items-center justify-between gap-3 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-400">{label}</span>
        {!value && hint ? <span className="hidden text-[10px] text-zinc-500 sm:block">{hint}</span> : null}
      </div>

      {value ? (
        <div className="skin-search-selected group relative min-h-32 overflow-hidden rounded-[26px] border border-white/10 bg-white/[.05] p-4">
          <div
            className="absolute inset-0 opacity-60 transition duration-500 group-hover:opacity-100"
            style={{ background: `radial-gradient(circle at 24% 36%, ${value.rarity_color ?? "#6ea8ff"}1f, transparent 44%)` }}
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="interactive absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full border border-white/8 bg-black/25 text-zinc-500 backdrop-blur-md transition hover:border-white/15 hover:bg-white/10 hover:text-white"
            aria-label={`Remove ${value.name}`}
          >
            <X size={14} />
          </button>
          <div className="relative flex items-center gap-4 pr-8">
            <div className="grid h-24 w-28 shrink-0 place-items-center rounded-2xl border border-white/[.04] bg-black/15">
              {value.image_url ? <img src={value.image_url} alt={value.name} className="max-h-20 max-w-28 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,.5)]" /> : null}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-emerald-300"><Check size={12} /> Selected</div>
              <div className="line-clamp-2 text-base font-semibold leading-5 text-white">{value.name}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                {value.rarity_color ? <span className="size-1.5 rounded-full" style={{ background: value.rarity_color }} /> : null}
                {value.rarity_name ?? value.category ?? "CS2 skin"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="search-shell flex h-[76px] items-center gap-3 rounded-[24px] border border-white/10 px-5 transition duration-300 focus-within:border-blue-300/35 focus-within:shadow-[0_0_0_4px_rgba(96,165,250,.07),0_24px_70px_rgba(0,0,0,.35)]">
            <Search size={18} className="shrink-0 text-blue-300/80" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => (results.length || query.trim().length >= 2) && setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") return setOpen(false);
                if (!open || !results.length) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % results.length);
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => (i - 1 + results.length) % results.length);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  choose(results[activeIndex]);
                }
              }}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-zinc-500"
            />
            {loading ? <div className="size-4 animate-spin rounded-full border-2 border-white/15 border-t-white/70" /> : <ChevronDown size={16} className={`text-zinc-400 transition ${open ? "rotate-180" : ""}`} />}
          </div>

          {open ? (
            <div ref={listRef} className="search-results absolute z-[70] mt-3 max-h-[430px] w-full overflow-y-auto rounded-[24px] border border-white/10 bg-[#0d1119]/98 p-2 shadow-[0_35px_110px_rgba(0,0,0,.72)] backdrop-blur-3xl">
              {results.length ? results.map((skin, index) => (
                <button
                  key={skin.id}
                  data-result-index={index}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(skin)}
                  className={`interactive flex w-full items-center gap-3.5 rounded-[18px] p-2.5 text-left transition ${activeIndex === index ? "bg-white/[.08]" : "hover:bg-white/[.05]"}`}
                >
                  <div className="grid h-16 w-20 shrink-0 place-items-center rounded-2xl border border-white/[.035] bg-black/20">
                    {skin.image_url ? <img src={skin.image_url} alt="" className="max-h-12 max-w-[72px] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.5)]" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{skin.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{skin.weapon_name ?? skin.category}</span>
                      {skin.finish_name ? <><span className="text-zinc-600">•</span><span className="truncate">{skin.finish_name}</span></> : null}
                    </div>
                  </div>
                  <span className="hidden items-center gap-1.5 rounded-full border border-white/8 px-2.5 py-1 text-[10px] font-medium text-zinc-400 sm:flex">
                    {skin.rarity_color ? <span className="size-1.5 rounded-full" style={{ background: skin.rarity_color }} /> : null}
                    {skin.rarity_name ?? "Skin"}
                  </span>
                </button>
              )) : error ? (
                <div className="px-4 py-8 text-center text-sm leading-6 text-rose-300/80">{error}</div>
              ) : !loading && query.trim().length >= 2 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">No matching skins found.</div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
