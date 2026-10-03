"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { SkinSearch } from "@/components/SkinSearch";
import type { Skin } from "@/lib/types";

export function AdminSkinPicker() {
  const router = useRouter();
  const [skin, setSkin] = useState<Skin | null>(null);
  return (
    <div className="glass-panel rounded-[30px] p-5 md:p-6">
      <SkinSearch label="Choose a skin to edit" value={skin} onChange={setSkin} placeholder="Search any imported skin…" />
      <button type="button" disabled={!skin} onClick={() => skin && router.push(`/admin/skins/${skin.slug}`)} className="primary-button mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold disabled:opacity-35">Edit skin intelligence <ArrowRight size={15}/></button>
    </div>
  );
}
