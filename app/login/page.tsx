"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    router.push("/");
    router.refresh();
  }

  async function signUp() {
    setMessage("");
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled.");
  }

  return (
    <main className="relative mx-auto min-h-[78vh] max-w-7xl px-5 py-16">
      <div className="pointer-events-none absolute left-1/2 top-12 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="relative mx-auto max-w-md">
        <Link href="/" className="interactive inline-flex items-center gap-2 text-xs text-zinc-600 transition hover:text-white"><ArrowLeft size={14} /> Back to SkinVersus</Link>
        <div className="glass-panel mt-8 rounded-[34px] p-6 md:p-8">
          <div className="eyebrow">Optional account</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-white">Sign in to write reviews.</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-600">Comparisons, battle votes and skin upvotes work without an account. Login is only for persistent community features like written reviews.</p>

          <form onSubmit={signIn} className="mt-8 space-y-3">
            <label className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 transition focus-within:border-white/20"><Mail size={16} className="text-zinc-600" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" /></label>
            <label className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 transition focus-within:border-white/20"><LockKeyhole size={16} className="text-zinc-600" /><input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" /></label>
            <button disabled={busy} className="primary-button h-12 w-full rounded-full text-sm font-bold disabled:opacity-50">{busy ? "Please wait…" : "Sign in"}</button>
          </form>
          <button disabled={busy} onClick={signUp} className="interactive mt-3 h-12 w-full rounded-full border border-white/10 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50">Create account</button>
          {message ? <p className="mt-4 rounded-2xl border border-white/[.06] bg-white/[.025] p-3 text-xs leading-5 text-zinc-400">{message}</p> : null}
        </div>
      </div>
    </main>
  );
}
