import Link from "next/link";
import { CircleUserRound, Layers3, Palette, Shield, Swords, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GlobalSearch } from "@/components/GlobalSearch";

export async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const userId = data?.claims?.sub;
  const { data: profile } = userId ? await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle() : { data: null };
  const isAdmin = Boolean(profile?.is_admin);

  return (
    <header id="top" className="site-header sticky top-0 z-50 border-b border-white/[.055]">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-3 px-5">
        <Link href="/" className="interactive group flex shrink-0 items-center gap-2.5 font-semibold tracking-[-.03em] text-white">
          <span className="brand-mark grid size-9 place-items-center rounded-xl"><Swords size={17} /></span>
          <span className="text-[17px]">SkinVersus</span>
        </Link>

        <nav className="ml-7 hidden items-center gap-1 text-[12px] font-medium text-zinc-500 lg:flex">
          <Link className="nav-pill" href="/">Compare</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/#multi-compare"><Layers3 size={13} /> Multi</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/rankings"><Trophy size={13} /> Rankings</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/combos"><Palette size={13} /> Combos</Link>
          {isAdmin ? <Link className="nav-pill inline-flex items-center gap-1.5" href="/admin"><Shield size={13} /> Admin</Link> : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          {signedIn ? (
            <form action="/auth/sign-out" method="post">
              <button className="interactive rounded-full border border-white/10 px-4 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white">Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="interactive inline-flex size-9 items-center justify-center rounded-full border border-white/[.075] bg-white/[.035] text-zinc-400 transition hover:bg-white/[.07] hover:text-white sm:size-auto sm:px-4 sm:py-2 sm:text-[12px] sm:font-semibold">
              <CircleUserRound size={16} className="sm:mr-1.5" /><span className="hidden sm:inline">Account</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
