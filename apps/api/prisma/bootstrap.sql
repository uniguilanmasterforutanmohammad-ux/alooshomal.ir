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

-- Imported (unclaimed) profiles are grouped into batches so the admin can roll
-- back one import run without touching the others. Rows imported before this
-- feature existed are attached to a single legacy batch.
INSERT INTO "business_card_import_batches"
  (id, label, source, note, "createdAt")
VALUES
  ('legacy-behtarino-import', 'ایمپورت اولیه به‌ترینو', 'behtarino',
   'کارت‌های واردشده پیش از افزودن دسته‌بندی ایمپورت', now())
ON CONFLICT (id) DO NOTHING;

UPDATE "business_cards"
SET "importBatchId" = 'legacy-behtarino-import'
WHERE "isUnclaimed" = true AND "importBatchId" IS NULL;

-- Imported profiles stay out of the public directory until their owner claims
-- and completes them; their direct link keeps working for the invitation.
UPDATE "business_cards"
SET "isPublished" = false
WHERE "isUnclaimed" = true AND "isPublished" = true;
