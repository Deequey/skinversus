import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  skinId: z.uuid(),
  rating: z.number().int().min(1).max(10),
  body: z.string().trim().min(3).max(1200),
});

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: userId,
      skin_id: parsed.data.skinId,
      rating: parsed.data.rating,
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "skin_id,user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
