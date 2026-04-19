# `supabase/`

Idempotent SQL migrations for the Finvest Supabase project. There is no Supabase CLI workflow yet — these files are designed to be **pasted into the Supabase SQL editor** in order. Every statement is wrapped in `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` so re-running them is safe.

## Layout

```
supabase/
└── sql/
    ├── 001_user_profiles.sql            # Schema, indices, RLS policies, new-user trigger
    └── 002_user_profiles_avatar_url.sql # Adds the optional avatar_url column
```

## What `001_user_profiles.sql` sets up

```
public.user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  display_name    TEXT,
  fear_score      INTEGER,
  classification  TEXT,
  dashboard_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

- Unique constraint + index on `user_id` (one profile per auth user).
- Index on `created_at` for admin views.
- Row Level Security **enabled** with three policies for the `authenticated` role:
  - `select` where `auth.uid() = user_id`
  - `insert` with check `auth.uid() = user_id`
  - `update` where `auth.uid() = user_id` (with check)
- A `BEFORE UPDATE` trigger that bumps `updated_at`.
- An `AFTER INSERT ON auth.users` trigger calling `public.handle_new_user()` (`SECURITY DEFINER`) that inserts a baseline `user_profiles` row with `email` and `display_name` taken from `raw_user_meta_data.full_name` / `name`.

## What `002_user_profiles_avatar_url.sql` adds

`ALTER TABLE … ADD COLUMN IF NOT EXISTS avatar_url TEXT;` — this column is mirrored from `auth.users.user_metadata.avatar_url` by `userProfileService.ensureUserProfile()`.

## How to apply

1. Open the Supabase project's **SQL Editor**.
2. Paste the contents of `001_user_profiles.sql`, run it.
3. Paste the contents of `002_user_profiles_avatar_url.sql`, run it.
4. Verify under **Table editor → public.user_profiles** that the table and policies show up.

If you ever wipe the table, the trigger guarantees a fresh row will be created the next time a user signs up — you don't need to manually backfill anything.

## How the JSONB `dashboard_prefs` is used

The full de-facto schema is documented in [`docs/architecture.md`](../architecture.md) §5.3. In short:

- `assessment` — Decode Your Finance Self quiz result + traits + cluster + allocation
- `ppRoadmap` — booleans for the 5-step Personalized Portfolio Hub
- `emotion` — Emotional Readiness Test summary
- `nft_badges` — Issued certificates (off-chain) and any minted token references

`mergeDashboardPrefs()` deep-merges patches into this JSON without nuking neighbours, with special-case handling for `nft_badges`.

## Future migrations

If you add new tables, drop them in as `00X_*.sql` next to these. Keep filenames numerically ordered so future contributors know the apply order.

## Why no Supabase CLI?

The team works mostly inside the Supabase web UI for low-overhead schema changes. Adding the CLI / a `supabase/migrations/` folder later is straightforward — just rename `sql/` → `migrations/` and add a `config.toml`.
