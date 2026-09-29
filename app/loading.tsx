export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <div className="animate-pulse">
        <div className="mx-auto h-3 w-32 rounded-full bg-white/[.05]" />
        <div className="mx-auto mt-6 h-12 max-w-2xl rounded-2xl bg-white/[.055]" />
        <div className="mx-auto mt-3 h-5 max-w-lg rounded-xl bg-white/[.035]" />
        <div className="mt-12 grid gap-5 md:grid-cols-2"><div className="h-80 rounded-[36px] bg-white/[.035]" /><div className="h-80 rounded-[36px] bg-white/[.035]" /></div>
      </div>
    </main>
  );
}
