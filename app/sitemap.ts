import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();
  const { data } = await supabase.from("skins").select("slug,updated_at").order("updated_at", { ascending: false }).limit(5000);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/rankings`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/combos`, changeFrequency: "weekly", priority: 0.8 },
    ...(data ?? []).map((skin) => ({
      url: `${base}/skins/${skin.slug}`,
      lastModified: skin.updated_at ? new Date(skin.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
