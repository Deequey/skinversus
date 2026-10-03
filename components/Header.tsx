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
    <header id="top" className="site-header sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="header-shell mx-auto flex h-[64px] max-w-7xl items-center gap-3 rounded-[22px] px-3 sm:px-4">
        <Link href="/" className="interactive group flex shrink-0 items-center gap-3 font-semibold tracking-[-.035em] text-white">
          <span className="brand-mark grid size-10 place-items-center rounded-[14px]"><Swords size={18} /></span>
          <span className="hidden sm:block">
            <span className="block text-[16px] leading-none">SkinVersus</span>
            <span className="brand-subline mt-1 block text-[9px] font-semibold uppercase tracking-[.18em]">CS2 compare</span>
          </span>
        </Link>

        <nav className="nav-shell ml-4 hidden items-center gap-0.5 rounded-full p-1 text-[12px] font-semibold lg:flex">
          <Link className="nav-pill" href="/">Compare</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/#multi-compare"><Layers3 size={13} /> Multi</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/rankings"><Trophy size={13} /> Rankings</Link>
          <Link className="nav-pill inline-flex items-center gap-1.5" href="/combos"><Palette size={13} /> Combos</Link>
          {isAdmin ? <Link className="nav-pill inline-flex items-center gap-1.5" href="/admin"><Shield size={13} /> Admin</Link> : null}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[.035] px-3 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-emerald-200/75 xl:flex">
            <span className="live-dot" /> Live database
          </div>
          <GlobalSearch />
          {signedIn ? (
            <form action="/auth/sign-out" method="post">
              <button className="header-action interactive rounded-full px-4 py-2.5 text-[12px] font-semibold">Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="header-action interactive inline-flex size-10 items-center justify-center rounded-full text-zinc-200 sm:size-auto sm:px-4 sm:py-2.5 sm:text-[12px] sm:font-semibold">
              <CircleUserRound size={16} className="sm:mr-1.5" /><span className="hidden sm:inline">Account</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
