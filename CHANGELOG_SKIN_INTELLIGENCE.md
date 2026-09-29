# SkinVersus — Skin Intelligence update

## Added

- Dominant color palette extraction from skin images.
- Semantic color names such as Emerald, Lime, Navy, Gold, Burgundy and Pink.
- Manual palette overrides from an admin-only editor.
- Per-skin notes: float tips, pattern tips, combo tips, rare variants, warnings and facts.
- `/combos` Combo Finder for color-matching knives and gloves.
- Per-skin combo suggestions on public skin pages.
- Color palette display on public skin pages and multi-compare tables.
- `/admin` skin intelligence editor.
- Batch palette analyzer: `npm run analyze:colors`.
- Combined import + palette sync: `npm run sync:skins`.
- Supabase migration: `supabase/migrations/20260929_skin_intelligence.sql`.

## Database upgrade

Existing databases should run only the migration file above. It adds `profiles.is_admin`, `skin_colors`, `skin_notes`, indexes and RLS policies.

Then promote your own account to admin from Supabase SQL Editor:

```sql
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and u.email = 'you@example.com';
```

## Palette behavior

- Automatic palettes are stored with `source = 'auto'`.
- Manual colors are stored with `source = 'manual'`.
- If a skin has at least one manual color, the manual palette is used publicly.
- Clearing the manual palette immediately falls back to the saved automatic palette.
- Combo scores compare palettes in perceptual Lab color space and weight dominant colors by percentage.
