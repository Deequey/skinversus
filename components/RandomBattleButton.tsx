"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";

export function RandomBattleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/random-pair", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not pick skins");
      router.push(`/compare/${data.left}/vs/${data.right}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="interactive inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-violet-300/25 hover:bg-violet-300/[.08] hover:text-white disabled:opacity-50">
      <Shuffle size={14} className={busy ? "animate-spin" : ""} /> {busy ? "Picking…" : "Surprise me"}
    </button>
  );
}
