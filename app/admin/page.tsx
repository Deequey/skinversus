import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { AdminSkinPicker } from "@/components/AdminSkinPicker";
import { isCurrentUserAdmin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) notFound();
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center"><Shield className="mx-auto text-emerald-300" size={26}/><div className="eyebrow mt-5">Admin</div><h1 className="mt-4 text-4xl font-semibold tracking-[-.055em] text-white md:text-6xl">Skin intelligence editor.</h1><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-500">Add float or pattern notes, generate an automatic palette from the item image, or create a manual palette override when the automatic colors miss the visual identity.</p></div>
      <div className="mx-auto mt-10 max-w-3xl"><AdminSkinPicker/></div>
    </main>
  );
}
