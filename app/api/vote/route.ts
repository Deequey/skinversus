import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  comparisonId: z.uuid(),
  winnerSkinId: z.uuid(),
  voterToken: z.uuid(),
});

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("cast_vote", {
    p_comparison_id: parsed.data.comparisonId,
    p_winner_skin_id: parsed.data.winnerSkinId,
    p_voter_token: parsed.data.voterToken,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
