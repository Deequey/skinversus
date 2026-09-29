"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // User cancelled the native share sheet.
    }
  }

  return (
    <button type="button" onClick={share} className="interactive inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[.06] hover:text-white">
      {copied ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
