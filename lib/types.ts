export type Skin = {
  id: string;
  api_id: string | null;
  slug: string;
  name: string;
  weapon_name: string | null;
  finish_name: string | null;
  category: string | null;
  rarity_name: string | null;
  rarity_color: string | null;
  min_float: number | null;
  max_float: number | null;
  stattrak: boolean;
  souvenir: boolean;
  image_url: string | null;
  market_hash_name: string | null;
  price_usd: number | null;
};

export type RankedSkin = Skin & {
  battle_wins: number;
  battle_votes: number;
  likes: number;
  dislikes: number;
  community_score: number | null;
};

export type ComparisonStats = {
  comparison_id: string;
  skin_a_id: string;
  skin_b_id: string;
  total_votes: number;
  a_votes: number;
  b_votes: number;
};

export type PlatformStats = {
  skins: number;
  battles: number;
  reviews: number;
  reactions: number;
};

export type SkinColor = {
  id: string;
  skin_id: string;
  hex: string;
  percentage: number | null;
  color_name: string;
  is_primary: boolean;
  source: "auto" | "manual";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type SkinNoteType = "float_tip" | "pattern_tip" | "combo_tip" | "rare_variant" | "warning" | "fun_fact";

export type SkinNote = {
  id: string;
  skin_id: string;
  type: SkinNoteType;
  title: string;
  content: string;
  min_float: number | null;
  max_float: number | null;
  priority: number;
  created_at?: string;
  updated_at?: string;
};

export type ComboMatch = {
  skin: RankedSkin;
  colors: SkinColor[];
  match_score: number;
};
