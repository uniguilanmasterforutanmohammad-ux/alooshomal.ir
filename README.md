# Alooshomal - Digital Biolink & Business Card Platform

Persian (RTL) platform to build, personalize and share digital **biolinks** and
**business cards**. Recipients open either in the browser with no app install, tap
contact actions, and save a standard `vCard` to their device.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | NestJS 11 (TypeScript) |
| Frontend | Next.js 16 (App Router) |
| ORM | Prisma 6 |
| Database | PostgreSQL 17 |
| Runtime | Node.js 24 (LTS) |
| Infra | Docker + Docker Compose |

## Structure

```
.
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── prisma/          # schema + seed
│   │   └── src/
│   │       ├── auth/        # JWT, phone OTP + email/password, set-password
│   │       ├── users/
│   │       ├── biolinks/       # biolink CRUD + vCard + QR + scan
│   │       ├── businesscards/  # business-card CRUD + vCard + QR + scan
│   │       ├── admin/       # review and approve/reject biolinks & business cards
│   │       ├── prisma/
│   │       └── common/      # guards, filters, shared DTOs
│   └── web/                 # Next.js frontend (RTL, Shabnam, vintage retro)
├── docker-compose.yml       # production
├── docker-compose.dev.yml   # development override (hot reload)
└── install.sh               # this generator script
```

## Quick start

```bash
./install.sh
docker compose up --build -d
```

Then:

- Frontend: http://localhost:3000
- Biolink directory: http://localhost:3000/biolinks
- Business-card directory: http://localhost:3000/business-cards
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs (OpenAPI JSON: http://localhost:4000/api/docs-json — see `docs/API.md`)
- Health: http://localhost:4000/api/health

### Development mode (hot reload)

```bash
npm run dev
# = docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

In dev mode both apps bind-mount their source and run with watch/HMR
(`nest start --watch` / `next dev`), so **you do not rebuild containers after each
change** — saving a file is enough. Rebuild is only needed when `package.json`,
the `Dockerfile` or a build-time variable such as `NEXT_PUBLIC_*` changes.

> A container started with **only** `docker-compose.yml` has no bind-mount, so code
> edits never show up until the image is rebuilt. Always use the dev overlay
> locally, and never on production.

See `docs/DEVELOPMENT.md` for the full local-vs-production guide, the exact
rebuild triggers, and common local issues.

### Migrations and seed data

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

Default seed accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@alooshomal.local` | `Admin@12345` |
| User | `demo@alooshomal.local` | `Demo@12345` |

> Real values live in `.env`. Change them before deploying to production.

### Database snapshots (backup & restore)

User data is valuable, and structural schema changes used to be able to wipe it.
The project now takes automatic `pg_dump` snapshots so a bad change is always
recoverable.

**Automatic (before a schema change).** The API container entry point
(`apps/api/docker-entrypoint.sh`) hashes `prisma/schema.prisma` on every boot. If
the hash changed *and* the database already holds tables, it writes a snapshot to
`/usr/src/app/backups` (the persistent `alooshomal_api_backups` volume) **before**
running `prisma db push`. Fresh/empty databases are skipped, and only the newest
`BACKUP_KEEP` snapshots (default `20`) are retained.

**Manual.**

```bash
npm run db:backup        # or ./scripts/backup.sh  → ./backups/alooshomal_<stamp>.sql.gz
npm run db:backups       # list existing snapshots
npm run db:restore       # restore the newest snapshot (asks for confirmation)
npm run db:restore -- backups/alooshomal_20261011-090000.sql.gz
```

The manual scripts talk to the running `db` container, so they work identically
in development and production. Override `BACKUP_DIR` / `BACKUP_KEEP` via `.env`
to change where snapshots live and how many are kept.

## Approval workflow (biolinks & business cards)

Both features follow the same moderation flow.

1. A user registers and creates a biolink or business card -> status `PENDING`.
2. Until an admin decides, the item is never shown on any public path.
3. Admin approves -> `APPROVED` and published; link and QR become active.
4. Admin rejects -> `REJECTED`; the reason is stored and shown to the user.
5. Any edit sends the biolink back to `PENDING` for another review.

Every decision is stored in `moderation_logs` with time, admin and reason.

## Live biolink editing

- The biolink creation page (`/dashboard/biolinks/new`) is not a plain form: the
  editor sits next to a **live preview** that updates on every keystroke
  (name, title, company, bio, contacts, socials, city, business and color).
- The admin review flow shows the same live preview and lets the admin
  **edit every field in place** before approving or rejecting. Admin edits go
  through `PATCH /api/admin/biolinks/:id` and do not change the moderation status.
- `GET /api/admin/biolinks/:id` returns the full biolink for the admin editor.

## Cities and business categories

Admins manage the dropdown options used in the biolink creation form.

- `GET /api/cities` and `GET /api/businesses` return active options (public).
- `GET|POST|PATCH|DELETE /api/admin/cities` manage cities (admin only).
- `GET|POST|PATCH|DELETE /api/admin/businesses` manage business categories.
- Each option can be renamed, deactivated (hidden from the form) or deleted.
- In the web app these live under the admin panel tab "شهرها و کسب‌وکارها".

The biolink form at `/dashboard/biolinks/new` includes "شهر" and "کسب و کار"
dropdowns populated from these lists.

## Biolink directory

Public page at `/biolinks` lists only published biolinks and supports:

- free-text search across name, job title, company and bio (`?q=`)
- filters by **city** (`?cityId=`) and **business category** (`?businessId=`)
- sorting by **جدیدترین** or **محبوب‌ترین** (`?sort=recent|liked`)
- server-side pagination (`?page=`) using the admin-configurable page size
  (default 10) — only that many rows are fetched per request

The backing endpoint is `GET /api/biolinks/public` and never exposes biolinks that
are pending, rejected or unpublished.

### Directory sorting, likes and boosts

- Directories (`/biolinks`, `/business-cards`) sort by **جدیدترین** (`pinnedAt`,
  which equals the creation time and is only reset by an approved boost) or by
  **محبوب‌ترین** (like count).
- Signed-in users can like any published item once. The web app sends a random
  `x-visitor-id`; likes are stored in `biolink_likes` / `business_card_likes`.
  Endpoint: `POST /api/<biolinks|business-cards>/public/:slug/like`.
- Because the public pages are server-rendered, the like button reconciles its
  state on mount via `GET /api/<biolinks|business-cards>/public/:slug/like`, so a
  refresh keeps the red heart for items the current visitor liked.
- Signed-in users can also **save** (bookmark) items:
  `POST /api/<biolinks|business-cards>/public/:slug/save`; saved items are listed
  on `/dashboard/saved` (`GET /api/<biolinks|business-cards>/saved/mine`).
- Anonymous visitors who click like/save are redirected to `/login`.
- **پله (boost)** — a user asks from the *افزایش بازدید* page to pin one of their
  items to the top. After an admin approves (`PATCH /api/admin/boosts/:id`), the
  item's `pinnedAt` is reset and `boostedUntil` = now + 7 days, so it sorts as the
  newest item until newer content pushes it back down. Boosted items show a golden
  **پله** badge in the directories, and `/dashboard/boost` shows each item's live
  rank and page (e.g. «ردیف ۵۵ • صفحه ۳»).

### Directory page size (admin setting)

- Admins set how many cards each directory page shows from the admin panel
  *تنظیمات* → *نمایش دایرکتوری* (`GET/PATCH /api/admin/settings`).
- The value is stored in the `Setting` table (key `directoryPageSize`, default 10)
  and read by the public directory endpoints; the public value is exposed at
  `GET /api/settings/public`.

## Subscriptions

Three built-in plans ship with the project (`apps/api/src/common/plans.ts`) and are
seeded on boot / by the seed script:

| Plan | Biolinks | Business cards | Links (social/web) |
| --- | --- | --- | --- |
| رایگان (free) | 1 | 1 | hidden |
| اکو (eco) | 1 | 1 | shown |
| بلاس (plus) | 3 | 3 | shown (all Eco features) |

- A user requests a plan from `/dashboard/subscriptions` →
  `POST /api/subscriptions/request`.
- An admin approves or rejects it in the admin panel *اشتراک‌ها* →
  `PATCH /api/admin/subscriptions/:id`; approval assigns the plan to the user and
  enforces its limits on future creations.
- Admins can also create/edit plans (`/api/admin/plans`) and assign a plan
  directly (`PATCH /api/admin/users/:id/plan`).
- When a plan hides links, `findPublicBySlug` blanks out `website`, `linkedin`,
  `instagram`, `telegram`, `twitter` and `whatsapp` on the public page.

## Dashboard

- `/dashboard/cards` — one place listing every biolink and business card the user
  owns, with delete (kept as a standalone page; the duplicate nav item was removed).
- `/dashboard/boost` — *افزایش بازدید*: a summary of the user's items (views,
  likes, live directory rank + page, last effective boost date) and the *پله*
  request action.
- `/dashboard/saved` — *ذخیره‌شده‌های من*: biolinks and business cards the user
  bookmarked from the directories.
- `/dashboard/subscriptions` — plan catalogue, current plan and request history.

Each card on `/dashboard/biolinks` and `/dashboard/business-cards` shows a compact
stats row (likes, directory rank + page, saves by users, total views) plus a small
*درخواست پله* button.

## Notifications

Every meaningful action produces an in-app notification (`notifications` table):
registration, new/approved/rejected cards, subscription & boost requests and
decisions, tickets and replies, and account activation/deactivation.

- Users: `GET /api/notifications/mine`, `PATCH /api/notifications/mine/:id/read`,
  `PATCH /api/notifications/mine/read-all`.
- Admins: `GET /api/admin/notifications`, `PATCH /api/admin/notifications/:id/read`,
  `PATCH /api/admin/notifications/read-all`.
- A bell icon (`NotificationBell`) in both the user and admin headers shows the
  unread badge and polls every 30 seconds.

## Admin user management

In the admin *کاربران* tab an admin can:

- deactivate / reactivate an account (`PATCH /api/admin/users/:id/active`, with a
  mandatory reason when deactivating),
- leave an internal note (`PATCH /api/admin/users/:id/comment`),
- delete a user (`DELETE /api/admin/users/:id`).

Admin accounts cannot be deactivated or deleted. Deactivated users get `401` on
login until reactivated.

## Admin list pagination

The admin *بیولینک‌ها*, *کارت‌های ویزیت* and *کاربران* tabs are paginated and fetch
only one page at a time. The page size is configurable in admin *تنظیمات*
(`adminListPageSize`, default 10) alongside the directory page size
(`directoryPageSize`).

## Backup & restore

See `docs/BACKUP-RESTORE.md` for the full guide to automatic and manual database
snapshots and how to restore them.

## Media storage

Uploaded images (logos, avatars) are stored in an S3-compatible object store
(MinIO / `pgsty/silo`). See `docs/STORAGE.md` for the folder/file layout, the
graphical console address and credentials, and how to migrate the media volume
to a new or dedicated media server.

## Technical notes

- Input validation via `class-validator`; uniform responses `{ success, data }`.
- JWT auth as a global guard; public routes are marked with `@Public()`.
- Role-based access control for the admin panel (`ADMIN`).
- Security headers via `helmet`; CORS restricted to the frontend origin.
- Auth security details (password hashing, OTP, rate limits, tokens, sessions)
  are documented in `docs/SECURITY.md`.
- The four revenue models (subscription, boost/پله, directory ad, home-page ad)
  and how each one is implemented are documented in `docs/REVENUE-MODELS.md`.
- Version-by-version, user-facing changes live in `CHANGELOG.md`.
- Frontend is RTL, Persian, Shabnam font, vintage retro design.
- QR and images are generated efficiently to keep the public page fast.

### Bundled fonts

The Persian UI uses **Shabnam v5.0.1** (every weight plus the `Farsi-Digits` and
`Without-Latin` variants) and **Vazirmatn**. Because font binaries are heavy,
`install.sh` does not embed them; instead it copies them from a font folder that
ships next to the script:

```
.
├── install.sh
├── shabnam-font-v5.0.1/          # Shabnam package (weights/formats/variants)
└── Vazirmatn[wght].woff2        # optional variable font
```

When you run `install.sh`, every recognized font file found in
`shabnam-font-v5.0.1/` is copied into `apps/web/public/fonts/shabnam/`
(sub-folders such as `Farsi-Digits/` are preserved), and
`Vazirmatn[wght].woff2` is copied to `apps/web/public/fonts/`. Missing fonts are
skipped with a warning, so the project still boots with a fallback font. The
files remain tracked under `apps/web/public/fonts/` and are ignored by
`scripts/sync_install.py` (binary extensions).
