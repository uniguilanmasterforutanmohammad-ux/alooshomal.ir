-- Idempotent database bootstrap run on every container start, after
-- `prisma db push`. Prisma's schema language cannot express index operator
-- classes (GIN/trigram) or extensions, so those live here.
--
--   * pg_trgm + GIN indexes accelerate the public directory search, which uses
--     `ILIKE '%term%'` over fullName/jobTitle/company/bio.
--   * The composite indexes speed up the default directory ordering
--     (`status, isPublished, pinnedAt DESC`).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Biolink search (trigram)
CREATE INDEX IF NOT EXISTS "biolinks_fullName_trgm_idx"
  ON biolinks USING gin ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "biolinks_jobTitle_trgm_idx"
  ON biolinks USING gin ("jobTitle" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "biolinks_company_trgm_idx"
  ON biolinks USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "biolinks_bio_trgm_idx"
  ON biolinks USING gin (bio gin_trgm_ops);

-- BusinessCard search (trigram)
CREATE INDEX IF NOT EXISTS "business_cards_fullName_trgm_idx"
  ON business_cards USING gin ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_cards_jobTitle_trgm_idx"
  ON business_cards USING gin ("jobTitle" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_cards_company_trgm_idx"
  ON business_cards USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_cards_bio_trgm_idx"
  ON business_cards USING gin (bio gin_trgm_ops);

-- Directory ordering (status + isPublished + newest first)
CREATE INDEX IF NOT EXISTS "biolinks_status_published_pinned_idx"
  ON biolinks (status, "isPublished", "pinnedAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "business_cards_status_published_pinned_idx"
  ON business_cards (status, "isPublished", "pinnedAt" DESC, id DESC);
