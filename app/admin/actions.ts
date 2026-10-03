"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzeSkinImage } from "@/lib/color-analysis";
import { getColorFamily, normalizeHex } from "@/lib/color";
import type { SkinNoteType } from "@/lib/types";

async function adminClient() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) throw new Error("Admin sign-in required");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (!profile?.is_admin) throw new Error("Admin access required");
  return supabase;
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function analyzeColorsAction(formData: FormData) {
  const skinId = String(formData.get("skin_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!skinId || !slug) throw new Error("Missing skin");
  const supabase = await adminClient();
  const { data: skin } = await supabase.from("skins").select("image_url,name,weapon_name,category").eq("id", skinId).maybeSingle();
  if (!skin?.image_url) throw new Error("Skin image is unavailable");
  const colors = await analyzeSkinImage(skin.image_url, skin);
  const { error: deleteError } = await supabase.from("skin_colors").delete().eq("skin_id", skinId).eq("source", "auto");
  if (deleteError) throw deleteError;
  if (colors.length) {
    const { error } = await supabase.from("skin_colors").insert(colors.map((color) => ({ ...color, skin_id: skinId, source: "auto" })));
    if (error) throw error;
  }
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
  revalidatePath("/combos");
}

export async function addManualColorAction(formData: FormData) {
  const supabase = await adminClient();
  const skinId = String(formData.get("skin_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const hex = normalizeHex(String(formData.get("hex") ?? ""));
  const percentage = Math.max(1, Math.min(100, Number(formData.get("percentage") ?? 20) || 20));
  const isPrimary = formData.get("is_primary") === "on";
  const customName = String(formData.get("color_name") ?? "").trim();
  const { data: existing } = await supabase.from("skin_colors").select("sort_order").eq("skin_id", skinId).eq("source", "manual").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = Number(existing?.[0]?.sort_order ?? -1) + 1;
  if (isPrimary) await supabase.from("skin_colors").update({ is_primary: false }).eq("skin_id", skinId).eq("source", "manual");
  const { error } = await supabase.from("skin_colors").insert({ skin_id: skinId, hex, percentage, color_name: customName || getColorFamily(hex), is_primary: isPrimary || sortOrder === 0, source: "manual", sort_order: sortOrder });
  if (error) throw error;
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
  revalidatePath("/combos");
}

export async function deleteColorAction(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const { error } = await supabase.from("skin_colors").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
  revalidatePath("/combos");
}

export async function clearManualPaletteAction(formData: FormData) {
  const supabase = await adminClient();
  const skinId = String(formData.get("skin_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const { error } = await supabase.from("skin_colors").delete().eq("skin_id", skinId).eq("source", "manual");
  if (error) throw error;
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
  revalidatePath("/combos");
}

export async function addSkinNoteAction(formData: FormData) {
  const supabase = await adminClient();
  const skinId = String(formData.get("skin_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const type = String(formData.get("type") ?? "fun_fact") as SkinNoteType;
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const minFloat = numberOrNull(formData.get("min_float"));
  const maxFloat = numberOrNull(formData.get("max_float"));
  const priority = Number(formData.get("priority") ?? 0) || 0;
  if (!skinId || !title || !content) throw new Error("Title and content are required");
  const { error } = await supabase.from("skin_notes").insert({ skin_id: skinId, type, title, content, min_float: minFloat, max_float: maxFloat, priority });
  if (error) throw error;
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
}

export async function deleteSkinNoteAction(formData: FormData) {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const { error } = await supabase.from("skin_notes").delete().eq("id", id);
  if (error) throw error;
  revalidatePath(`/skins/${slug}`);
  revalidatePath(`/admin/skins/${slug}`);
}
