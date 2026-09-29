import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center px-5 py-20">
      <div className="glass-panel w-full rounded-[38px] p-10 text-center md:p-14">
        <SearchX className="mx-auto text-zinc-700" size={32} />
        <div className="eyebrow mt-6">404</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-white md:text-5xl">That skin slipped away.</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600">The page does not exist, the slug changed, or the skin has not been imported yet.</p>
        <Link href="/" className="primary-button mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold"><ArrowLeft size={15} /> Back to compare</Link>
      </div>
    </main>
  );
}
