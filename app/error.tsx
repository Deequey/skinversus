"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-5 py-20">
      <div className="glass-panel w-full rounded-[38px] p-10 text-center md:p-14">
        <TriangleAlert className="mx-auto text-amber-300/70" size={32} />
        <div className="eyebrow mt-6">Something went wrong</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-white">The data did not load correctly.</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600">Try the request again. If it keeps failing, check your Supabase URL, publishable key and database schema.</p>
        <button onClick={reset} className="primary-button mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold"><RefreshCw size={15} /> Try again</button>
      </div>
    </main>
  );
}
