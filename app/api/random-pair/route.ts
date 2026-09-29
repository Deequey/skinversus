import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { count, error: countError } = await supabase.from("skins").select("id", { count: "exact", head: true });
  if (countError || !count || count < 2) return NextResponse.json({ error: "Not enough skins" }, { status: 500 });

  const first = Math.floor(Math.random() * count);
  let second = Math.floor(Math.random() * count);
  if (second === first) second = (second + 1) % count;

  const [a, b] = await Promise.all([
    supabase.from("skins").select("slug").range(first, first).single(),
    supabase.from("skins").select("slug").range(second, second).single(),
  ]);

  if (a.error || b.error || !a.data?.slug || !b.data?.slug) {
    return NextResponse.json({ error: "Could not pick skins" }, { status: 500 });
  }

  return NextResponse.json({ left: a.data.slug, right: b.data.slug });
}
