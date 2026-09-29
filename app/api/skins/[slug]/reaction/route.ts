import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  reaction: z.union([z.literal(1), z.literal(-1)]),
  voterToken: z.uuid(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });

  const supabase = await createClient();
  const { data: skin } = await supabase.from("skins").select("id").eq("slug", slug).maybeSingle();
  if (!skin) return NextResponse.json({ error: "Skin not found" }, { status: 404 });

  const { error } = await supabase.rpc("react_to_skin", {
    p_skin_id: skin.id,
    p_reaction: parsed.data.reaction,
    p_voter_token: parsed.data.voterToken,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
