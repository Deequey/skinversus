"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Star } from "lucide-react";

export function ReviewForm({ skinId, signedIn }: { skinId: string; signedIn: boolean }) {
  const router = useRouter();
  const [rating, setRating] = useState(8);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <div className="rounded-[24px] border border-white/8 bg-white/[.025] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Star size={16} className="text-amber-300" /> Have an opinion?</div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">Voting stays anonymous. An account is only required to publish written reviews.</p>
        <Link href="/login" className="interactive mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white">Sign in to review</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skinId, rating, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error ?? "Could not save review");
      return;
    }
    setBody("");
    setMessage("Review saved.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-white/8 bg-white/[.025] p-5">
      <div className="flex items-center justify-between gap-4">
        <div><div className="text-sm font-semibold text-white">Your rating</div><div className="mt-1 text-xs text-zinc-600">1 = skip it · 10 = grail</div></div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.07] px-3 py-2 text-lg font-semibold text-amber-200">{rating}<span className="text-xs text-amber-200/45">/10</span></div>
      </div>
      <input type="range" min="1" max="10" step="1" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-5 w-full accent-white" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={3} maxLength={1200} required placeholder="What do you like or dislike? How does it look in-game? Is it worth the price?" className="mt-4 min-h-32 w-full resize-y rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20 focus:bg-black/30" />
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-zinc-600">{message || `${body.length}/1200`}</span><button disabled={busy} className="primary-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold disabled:opacity-50"><Send size={14} /> {busy ? "Saving…" : "Publish review"}</button></div>
    </form>
  );
}
