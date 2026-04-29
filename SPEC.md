# Tailor — Sewing Inventory App
## Implementation Specification (v1)

> This document is the single source of truth for an autonomous coding agent
> implementing Tailor. Read it end-to-end before starting work. Where
> alternatives exist this document chooses one — do not deviate without
> explicit user approval. Sections marked **Note** or **Suggestion** are
> non-normative.

---

## 1. Overview

Tailor is a personal sewing-supply inventory web app for a single user. It
tracks four kinds of items — **Cloths** (fabric), **Patterns**, **Materials**
(notions: thread, buttons, zippers…), and **Projects** (finished pieces that
consume the other three). It runs as a single Docker container, behind the
user's existing reverse proxy, with persistent data on a host-mounted volume.
The user pins it to their iPhone home screen and uses it like a native app.

### Non-goals
- Multi-user, sharing, social features, public access.
- Multi-currency, OCR, CSV import/export, receipt scanning.
- Offline mode, native apps, push notifications.
- High concurrency, horizontal scaling.

---

## 2. Tech stack

| Layer            | Choice                                                  |
|------------------|---------------------------------------------------------|
| Runtime          | Node.js 20 LTS                                          |
| Framework        | Next.js 15 (App Router) with TypeScript (strict)        |
| Database         | SQLite via `better-sqlite3`                             |
| ORM / migrations | Drizzle ORM + `drizzle-kit`                             |
| Styling          | Tailwind CSS                                            |
| UI components    | shadcn/ui (copy-in), Lucide icons                       |
| Forms            | `react-hook-form` + `zod` resolvers                     |
| Validation       | `zod`                                                   |
| i18n             | `next-intl`                                             |
| Image processing | `sharp` (uses bundled libvips with HEIC support)        |
| Auth             | Custom: bcrypt + HttpOnly session cookie                |
| Container base   | `node:20-bookworm-slim`                                 |
| Reverse proxy    | **Not** in this repo — user runs Caddy/nginx on host    |

**Rationale**: single-process, single-image deploy; no separate DB/queue/cache
container; stack is widely understood by coding agents.

---

## 3. Repository layout

```
tailor/
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── components.json                # shadcn config
├── README.md                      # quickstart + ops notes
├── SPEC.md                        # this file
├── scripts/
│   └── deploy-ghcr.sh             # build + push image to GHCR
├── messages/
│   ├── en.json
│   └── zh.json
├── public/
│   ├── icons/                     # PWA icons (192, 512, maskable, apple-touch)
│   └── splash/                    # iOS splash screens (optional)
├── src/
│   ├── middleware.ts              # auth + locale resolution
│   ├── app/
│   │   ├── layout.tsx             # root layout (PWA meta, providers)
│   │   ├── manifest.webmanifest
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx         # tab nav, top bar
│   │   │   ├── cloths/
│   │   │   ├── patterns/
│   │   │   ├── materials/
│   │   │   ├── projects/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/
│   │       ├── photos/
│   │       ├── cloths/
│   │       ├── patterns/
│   │       ├── materials/
│   │       ├── projects/
│   │       ├── tags/
│   │       ├── meta/              # categories, units
│   │       ├── backup/
│   │       └── health/
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   └── ...
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   ├── schema.ts
│   │   │   └── migrations/
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   └── password.ts
│   │   ├── images.ts
│   │   ├── consumption.ts
│   │   ├── i18n/
│   │   ├── seed.ts
│   │   └── format.ts              # money, dates, numbers
│   └── types/
└── data/                          # gitignored; created by docker volume
    ├── db/
    └── photos/{originals,display,thumbs}/
```

---

## 4. Persistence

- **DB file**: container path `/data/db/tailor.db`.
- **Photos**: container path `/data/photos/{originals,display,thumbs}/`.
- Both live under one volume mount: `./data:/data` on the host.
- The DB file and photos directory must survive container recreation. The
  agent must verify, before declaring done, that `docker compose down && up`
  preserves all data.

---

## 5. Data model

All tables include `created_at` and (where mutable) `updated_at` as ISO-8601
strings. All money is stored as integer cents (or fen / minor unit). Times
are UTC; rendering uses the user's browser timezone.

### `users`
| column          | type    | notes                            |
|-----------------|---------|----------------------------------|
| id              | INTEGER | PK, AUTOINCREMENT                |
| username        | TEXT    | UNIQUE NOT NULL                  |
| password_hash   | TEXT    | NOT NULL (bcrypt, cost 12)       |
| locale          | TEXT    | NOT NULL DEFAULT 'en'            |
| created_at      | TEXT    |                                  |
| updated_at      | TEXT    |                                  |

### `sessions`
| column      | type    | notes                                   |
|-------------|---------|-----------------------------------------|
| id          | TEXT    | PK — 32-byte random hex token           |
| user_id     | INTEGER | FK users.id ON DELETE CASCADE           |
| expires_at  | TEXT    | NOT NULL                                |
| created_at  | TEXT    |                                         |

Index: `(user_id)`.

### `photos`
| column        | type    | notes                                                              |
|---------------|---------|--------------------------------------------------------------------|
| id            | TEXT    | PK — UUID v4                                                       |
| user_id       | INTEGER | FK users.id                                                        |
| entity_type   | TEXT    | CHECK IN ('cloth','pattern','material','project')                  |
| entity_id     | INTEGER | NOT NULL                                                           |
| original_ext  | TEXT    | e.g. `jpg`, `heic`                                                 |
| is_cover      | INTEGER | 0/1; exactly one cover per entity, enforced in app layer           |
| sort_order    | INTEGER | NOT NULL DEFAULT 0                                                 |
| created_at    | TEXT    |                                                                    |

Index: `(entity_type, entity_id)`.

### `cloths`
| column            | type    | notes                                                          |
|-------------------|---------|----------------------------------------------------------------|
| id                | INTEGER | PK                                                             |
| user_id           | INTEGER | FK                                                             |
| name              | TEXT    | NOT NULL                                                       |
| quantity          | INTEGER | NOT NULL DEFAULT 1 (number of bolts/cuts of this cloth)        |
| length_total      | REAL    | NOT NULL                                                       |
| length_remaining  | REAL    | NOT NULL — auto-decremented by project consumption             |
| length_unit       | TEXT    | NOT NULL DEFAULT 'm'; one of `m`, `cm`, `yd`                   |
| width             | REAL    | nullable                                                       |
| width_unit        | TEXT    | one of `cm`, `m`, `in`                                         |
| source            | TEXT    | nullable (shop, URL, etc.)                                     |
| price_cents       | INTEGER | nullable; total purchase price                                 |
| purchased_at      | TEXT    | nullable; ISO date                                             |
| remarks           | TEXT    | nullable                                                       |

### `patterns`
| column        | type    | notes                                                                                  |
|---------------|---------|----------------------------------------------------------------------------------------|
| id            | INTEGER | PK                                                                                     |
| user_id       | INTEGER | FK                                                                                     |
| name          | TEXT    | NOT NULL                                                                               |
| size          | TEXT    | nullable; free text (e.g. "M", "8–12", "custom")                                       |
| pieces        | INTEGER | nullable; number of separate pieces in the set (e.g. paper sheets)                     |
| source        | TEXT    | nullable                                                                               |
| price_cents   | INTEGER | nullable                                                                               |
| purchased_at  | TEXT    | nullable                                                                               |
| remarks       | TEXT    | nullable                                                                               |

### `material_categories`
| column        | type    | notes                                |
|---------------|---------|--------------------------------------|
| id            | INTEGER | PK                                   |
| user_id       | INTEGER | FK — categories are per user         |
| name          | TEXT    | NOT NULL                             |
| sort_order    | INTEGER | NOT NULL DEFAULT 0                   |
| created_at    | TEXT    |                                      |

UNIQUE `(user_id, name)`.

Seeded defaults (translation keys; stored values are the default-locale name,
UI looks up translation by key when present): Thread, Button, Zipper, Elastic,
Interfacing, Ribbon, Lace, Trim, Bias tape, Snap, Hook & eye, Velcro, Other.

### `material_units`
Same shape as `material_categories`. Seeded defaults: piece, m, cm, ball,
spool, pack, roll, gram.

### `materials`
| column              | type    | notes                                  |
|---------------------|---------|----------------------------------------|
| id                  | INTEGER | PK                                     |
| user_id             | INTEGER | FK                                     |
| name                | TEXT    | NOT NULL                               |
| category_id         | INTEGER | FK material_categories, nullable       |
| unit_id             | INTEGER | FK material_units, nullable            |
| quantity_total      | REAL    | NOT NULL                               |
| quantity_remaining  | REAL    | NOT NULL — auto-decremented            |
| source              | TEXT    | nullable                               |
| price_cents         | INTEGER | nullable                               |
| purchased_at        | TEXT    | nullable                               |
| remarks             | TEXT    | nullable                               |

### `projects`
| column        | type    | notes                                                         |
|---------------|---------|---------------------------------------------------------------|
| id            | INTEGER | PK                                                            |
| user_id       | INTEGER | FK                                                            |
| name          | TEXT    | NOT NULL                                                      |
| quantity      | INTEGER | NOT NULL DEFAULT 1 (how many items produced)                  |
| price_cents   | INTEGER | nullable; additional out-of-pocket cost not tied to inventory |
| value_cents   | INTEGER | nullable; user-estimated worth                                |
| remarks       | TEXT    | nullable                                                      |

### `project_cloths`
| column        | type    | notes                                            |
|---------------|---------|--------------------------------------------------|
| id            | INTEGER | PK                                               |
| project_id    | INTEGER | FK projects ON DELETE CASCADE                    |
| cloth_id      | INTEGER | FK cloths ON DELETE RESTRICT                     |
| length_used   | REAL    | NOT NULL — in the cloth's `length_unit`          |
| created_at    | TEXT    |                                                  |

Index: `(project_id)`, `(cloth_id)`.

### `project_patterns`
| project_id, pattern_id | INTEGER | composite PK; FK ON DELETE CASCADE / RESTRICT |

### `project_materials`
| column          | type    | notes                              |
|-----------------|---------|------------------------------------|
| id              | INTEGER | PK                                 |
| project_id      | INTEGER | FK ON DELETE CASCADE               |
| material_id     | INTEGER | FK ON DELETE RESTRICT              |
| quantity_used   | REAL    | NOT NULL — in material's unit      |

### `tags`
| column     | type    | notes                |
|------------|---------|----------------------|
| id         | INTEGER | PK                   |
| user_id    | INTEGER | FK                   |
| name       | TEXT    | NOT NULL             |
| color      | TEXT    | nullable hex string  |

UNIQUE `(user_id, name)`.

### `entity_tags`
| entity_type | TEXT    | as in photos                                |
| entity_id   | INTEGER | NOT NULL                                    |
| tag_id      | INTEGER | FK tags ON DELETE CASCADE                   |

PK `(entity_type, entity_id, tag_id)`. Index `(tag_id)`.

### Schema-evolution discipline
- All schema changes go through a new Drizzle migration. **Never** edit a
  shipped migration.
- Use additive changes wherever possible (add column nullable, then backfill,
  then constrain) so persistent data survives upgrades.

---

## 6. Authentication & sessions

- **Bootstrap**: on container start, if `users` is empty, read
  `INITIAL_USERNAME` and `INITIAL_PASSWORD` env vars, hash with bcrypt
  (cost 12), insert user. After bootstrap the env vars are ignored — the user
  changes their password via the UI.
- **Login** `POST /api/auth/login` with `{ username, password }`:
  - Verify with bcrypt.
  - Insert `sessions` row with 32-byte random hex id, expiry 30 days from now.
  - Set cookie `tailor_session=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.
  - Return 200 `{ ok: true }`. On failure return 401 with no detail.
- **Logout** `POST /api/auth/logout`: delete the session row, clear cookie.
- **Middleware** (`src/middleware.ts`): for any path under `(app)` or any
  `/api/*` except `/api/auth/login` and `/api/health`, look up session by
  cookie, verify not expired, refresh `expires_at` (sliding window), attach
  `userId` to the request via headers for route handlers.
- **Password change** `POST /api/auth/password` `{ current, next }`: verify
  current, update hash, delete all sessions except the current one.
- **Sessions cleanup**: lazy — on each authenticated request, delete expired
  sessions for that user. No cron needed.

**No CSRF token** for v1. SameSite=Lax + single origin behind reverse proxy is
acceptable for personal use. Document this in SPEC §17.

---

## 7. i18n

- Locales: `en` (default), `zh` (Simplified Chinese, `zh-CN`).
- Messages: `messages/en.json`, `messages/zh.json`. Hierarchical keys grouped
  by feature, e.g. `cloths.summary.totalCost`, `common.actions.save`.
- Resolution order: `tailor_locale` cookie → `users.locale` (after auth) →
  `Accept-Language` → `DEFAULT_LOCALE` env → `en`.
- Language toggle in Settings updates both `users.locale` and the cookie.
- **Every** user-visible string lives in messages files. The agent must add a
  lint check (eslint rule or simple script) that fails CI/build if any
  string-literal JSX child appears in `app/(app)` or `components/` outside
  test files.
- Default category and unit names are stored as their English form;
  translations live under message keys like `meta.categories.thread`. The UI
  resolves the translation if a key matches, otherwise falls back to the
  stored name (so user-added customs render as-is).
- Dates: `Intl.DateTimeFormat`. Numbers and money: `Intl.NumberFormat`.

---

## 8. Photos

### Upload `POST /api/photos`
- Multipart form with fields: `file` (binary), `entityType`, `entityId`,
  optional `setCover` (boolean).
- Accept `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
- Reject if `> MAX_UPLOAD_MB` (default 20).
- Pipeline:
  1. Generate UUID.
  2. Save raw bytes to `originals/{uuid}.{ext}`.
  3. Use `sharp` to produce:
     - `display/{uuid}.webp` — long edge 1600 px, quality 80.
     - `thumbs/{uuid}.webp` — long edge 400 px, quality 75.
  4. Insert `photos` row. If `setCover` or it's the first photo, set
     `is_cover = 1` and clear other covers for that entity in the same
     transaction.
- Return `{ id, url: "/api/photos/{id}/display" }`.

### Serve `GET /api/photos/{id}/{variant}`
- `variant` ∈ `original|display|thumb`.
- Auth required. Verify the photo belongs to the requesting user.
- Stream from disk with `Cache-Control: private, max-age=31536000, immutable`.

### Delete `DELETE /api/photos/{id}`
- Auth + ownership check.
- Remove all three files; remove DB row. If it was the cover, promote the
  next-`sort_order` photo to cover.

### Reorder / set cover
- `PATCH /api/photos/{id}` with `{ sortOrder?, isCover? }`. Cover toggle
  enforces the single-cover invariant in a transaction.

### iPhone HEIC notes
- Sharp's prebuilt binary on `linux/amd64` and `linux/arm64` includes libheif.
  If decoding fails (architecture mismatch, unusual file), return HTTP 415
  with body `{ error: "heic_unsupported" }`.
- Document in README that the iPhone setting **Settings → Camera → Formats →
  Most Compatible** makes the camera roll send JPEG instead of HEIC, which
  sidesteps the issue entirely.
- The "take a photo" UI uses `<input type="file" accept="image/*"
  capture="environment">`; "from album" uses `<input type="file"
  accept="image/*" multiple>`.

---

## 9. UI / UX

### 9.1 Shell
- Root layout includes PWA meta (§13).
- Authenticated layout (`app/(app)/layout.tsx`):
  - **Mobile** (< 768 px): bottom tab bar, four tabs (Cloths / Patterns /
    Materials / Projects). Top bar shows current tab title and a settings
    icon (gear) in the top-right.
  - **Desktop** (≥ 768 px): top bar with brand on the left, four tabs in the
    centre, settings icon on the right.
- Settings is a separate route, not a tab. It links to: Language, Change
  password, Manage tags, Manage material categories, Manage material units,
  Backup / restore, Logout.

### 9.2 List view template
Each of the four tabs has the same shape:

1. **Summary block** — 2×2 (mobile) or 1×4 (desktop) of KPIs.
2. **Toolbar row** — search input (debounced 250 ms), filter button (opens a
   sheet/drawer), sort menu, view toggle (grid/list).
3. **Collection** — grid (default on mobile and desktop) or list (compact
   rows). Cards show cover thumbnail, name, primary stat. Tapping a card
   opens the **detail view**.
4. **FAB** — round "+" button bottom-right (16 px from bottom, above bottom
   tab bar on mobile). Opens the Add form for the current tab.

Filter and sort options are tab-specific:

| tab       | filters                                                                | sorts                                       |
|-----------|------------------------------------------------------------------------|---------------------------------------------|
| Cloths    | tag(s), source, purchased between, has-stock-left                      | name, date added, purchase date, price, length remaining |
| Patterns  | tag(s), source, used / never used                                      | name, date added, purchase date, price      |
| Materials | tag(s), category, unit, used / never used                              | name, date added, purchase date, price, qty remaining |
| Projects  | tag(s), uses pattern X, uses cloth X, uses material X                  | name, date added, price, value              |

### 9.3 Add / Edit form template
- One vertical form, sectioned: **Photos**, **Basic info**, **Purchase info**
  (where applicable), **Linked items** (projects only), **Tags**, **Remarks**.
- Photos section: thumbnail strip with reorder (drag on desktop, long-press
  on mobile), tap to set cover, swipe-or-button to delete; "Add photo" tile
  opens a chooser → camera or album.
- Save and Cancel pinned to the bottom on mobile; top-right on desktop.
- Forms validate on blur and on submit using `zod`. Server re-validates the
  same `zod` schema (single source of truth in `lib/schemas/`).

### 9.4 Detail view template
- Hero photo carousel (cover first; swipe between).
- All fields rendered as labelled rows.
- "Edit" button top-right.
- "Delete" button at the bottom, behind a confirm dialog.
- For Cloths/Materials/Patterns: a **"Used in projects"** section listing
  linked projects (clickable).

### 9.5 Cloths
**Summary KPIs**: # of cloths, total cost (sum of `price_cents`), total
length used (sum of `length_total - length_remaining`, summed only across
matching units; mixed-unit case shows multiple rows or normalises to metres
— normalise to metres for display, with cm/yd converted), total length
remaining.

**Card**: thumbnail, name, `length_remaining {unit} / length_total {unit}`,
small "out of stock" badge if `length_remaining ≤ 0`.

**Add/Edit fields**:
- Photos (multi).
- Basic: name (required), quantity (#, default 1), length total (required,
  numeric, with unit dropdown m/cm/yd), width (optional, with unit
  cm/m/in).
- Purchase: source, price, purchased date.
- Tags, Remarks.

**On create**, set `length_remaining = length_total`.
**On edit**, if `length_total` changes, adjust `length_remaining` by the
delta; refuse the edit if the result would go negative — instruct the user
to remove project consumption first.

### 9.6 Patterns
**Summary KPIs**: # of patterns, total cost, # used (≥ 1 link in
`project_patterns`), # never used.

**Card**: thumbnail, name, size, "used" / "never used" badge.

**Add/Edit fields**: photos, name (required), size, pieces (int), source,
price, purchased date, tags, remarks.

### 9.7 Materials
**Summary KPIs**: # of materials, total cost, # used, # never used.
"used" = `quantity_remaining < quantity_total`.

**Card**: thumbnail, name, category badge,
`quantity_remaining / quantity_total {unit}`.

**Add/Edit fields**:
- Photos.
- Basic: name (required), category (select with "+ Add new"), unit (select
  with "+ Add new"), quantity total (required), source, price, purchased
  date.
- "+ Add new" on category/unit opens an inline mini-dialog that creates the
  row in `material_categories` / `material_units` and selects it.
- Tags, Remarks.

**On create**, `quantity_remaining = quantity_total`.
**On edit**, `quantity_total` change behaviour mirrors Cloths.

### 9.8 Projects
**Summary KPIs**: # of projects, total cost (input `price_cents` plus
proportional cost from consumed cloths and materials, plus full pattern
prices — see §10.4), total estimated value (sum of `value_cents`), total
items produced (sum of `quantity`).

**Card**: thumbnail, name, computed cost vs value.

**Add/Edit fields**:
- Photos.
- Basic: name (required), quantity (default 1), price (extra cost), value.
- **Linked items**:
  - Patterns used: multi-select picker (search by name).
  - Cloths used: list of `(cloth, length used, unit)`. Picker shows current
    `length_remaining`. Length-used input is validated against remaining.
  - Materials used: list of `(material, quantity used)`. Same validation.
- Tags, Remarks.

Each link row has a "remove" button.

### 9.9 Settings
- Language: radio English / 中文.
- Change password.
- Manage tags: list, rename, delete (cascades to entity_tags).
- Manage material categories: list, rename, reorder, delete (sets affected
  materials to NULL category, with a confirm).
- Manage material units: same as categories.
- Backup / restore (§11).
- Logout.

### 9.10 Empty / loading / error states
- Every list view: empty state with an illustration-tier emoji, friendly
  copy, and a primary "Add your first X" button.
- Loading: skeleton cards on lists, skeleton hero on detail.
- Errors: toast for transient failures; inline message for form validation.

### 9.11 Accessibility
- All interactive elements keyboard-reachable; `:focus-visible` outline.
- Form fields have `<label>` associated.
- Color is never the sole carrier of meaning (badges include text).

---

## 10. Auto-consumption logic

Centralised in `src/lib/consumption.ts`. All inventory mutations flow through
helpers there to keep the rule in one place. **Always** wrap in a SQLite
transaction.

### 10.1 Cloth consumption
- Insert `project_cloths(cloth_id, length_used)`:
  - Verify `length_used > 0` and `length_used ≤ cloth.length_remaining`.
  - `UPDATE cloths SET length_remaining = length_remaining - length_used`.
- Update `project_cloths.length_used` from `oldLen` to `newLen`:
  - Compute `delta = newLen - oldLen`. Verify
    `cloth.length_remaining - delta >= 0`.
  - `UPDATE cloths SET length_remaining = length_remaining - delta`.
- Delete `project_cloths` row:
  - `UPDATE cloths SET length_remaining = length_remaining + length_used`.
- Cascade on project delete: restore each linked cloth's remaining.

### 10.2 Material consumption
Same shape as cloth, on `quantity_used` and `quantity_remaining`.

### 10.3 Pattern usage
- No quantity tracking. "used" is derived:
  `EXISTS(SELECT 1 FROM project_patterns WHERE pattern_id = ?)`.
- The materialised view is `patterns.used = EXISTS(...)`; cache as needed
  but a simple JOIN/count on read is fast enough at v1 scale.

### 10.4 Project cost calculation
- Cloth cost share per link: `(length_used / length_total) * cloth.price`.
  If `length_total = 0` (shouldn't happen), treat as 0.
- Material cost share per link:
  `(quantity_used / quantity_total) * material.price`.
- Pattern cost: full `pattern.price` for each link (a pattern can be reused;
  this overcounts cost but is simpler and is documented in §17).
- Project cost = sum of the above + `project.price_cents`.

---

## 11. Backup & restore

### Backup `GET /api/backup`
- Auth required.
- Stream a `.tar.gz` named `tailor-backup-{ISO-date}.tar.gz` containing:
  - `db/tailor.db` — produced by SQLite `VACUUM INTO '<temp>'` to get a
    consistent snapshot without locking writers.
  - `photos/` — entire photos directory.
- Use Node streams; do not buffer the whole archive in memory.

### Restore `POST /api/backup/restore`
- Auth required.
- Multipart upload of a tarball produced by the backup endpoint.
- Pipeline:
  1. Extract to a staging directory under `/data/restore-staging/`.
  2. Validate: must contain `db/tailor.db` and a `photos/` directory; must
     pass `PRAGMA integrity_check`.
  3. Stop accepting new writes (set an in-memory flag); commit pending
     writes; close DB connection.
  4. Move current `db/` and `photos/` to `/data/restore-backup-{timestamp}/`.
  5. Move staged content into place.
  6. Re-open DB, run migrations, clear the write-block flag.
- If any step fails, revert: move `restore-backup-*` back, delete staging.
- The Settings UI shows a confirm dialog: user must type `RESTORE` to
  proceed.

---

## 12. PWA

- `app/manifest.webmanifest` with:
  - `name: "Tailor"`, `short_name: "Tailor"`.
  - `start_url: "/"`, `scope: "/"`, `display: "standalone"`,
    `orientation: "portrait"`, `theme_color`, `background_color`.
  - `icons`: 192×192 and 512×512 PNG, plus a 512 maskable.
- `<head>` in root layout:
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="Tailor">`
  - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
  - viewport meta with `viewport-fit=cover` so the app uses the full screen
    on iPhone, and CSS uses `env(safe-area-inset-*)` for the bottom tab bar
    and FAB so they sit above the home indicator.
- **No service worker** in v1. We are not pursuing offline support; an
  empty/buggy service worker is worse than none.

---

## 13. Docker

### Dockerfile (multi-stage)
1. `deps`: `node:20-bookworm-slim`. Copy `package.json` + lockfile. Install
   only production deps with `npm ci --omit=dev` for runtime; install full
   deps in build stage.
2. `build`: full deps + source. Run `next build` (with
   `output: "standalone"` configured in `next.config.ts`). Run
   `drizzle-kit generate` if migrations aren't pre-generated (they should be
   committed).
3. `runtime`: `node:20-bookworm-slim`. Install `tini` for PID-1.
   Copy `.next/standalone`, `.next/static`, `public/`, `messages/`,
   `drizzle/` migrations, and a small `entrypoint.sh`.
4. `EXPOSE 3000`. `ENTRYPOINT ["tini", "--", "/app/entrypoint.sh"]`.

`entrypoint.sh`:
1. `mkdir -p /data/db /data/photos/{originals,display,thumbs}`.
2. Run migration (`node ./scripts/migrate.js` or `drizzle-kit migrate`
   against the prod DB path).
3. Run seeder (idempotent — bootstraps user from env if empty, seeds default
   categories and units).
4. `exec node server.js`.

Image must be multi-arch: `linux/amd64` and `linux/arm64`. The deploy host
might be either.

### `docker-compose.yml`

```yaml
services:
  tailor:
    image: ghcr.io/<owner>/tailor:latest
    container_name: tailor
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./data:/data
    env_file:
      - .env
```

- Bound to loopback on purpose: the host's reverse proxy forwards 443 → 3000.
- No SSL config in compose; not our concern.
- No healthcheck script in v1 (Next.js standalone has `/api/health` →
  `{ ok: true }`); compose can be extended later if the user wants it.

### `.env.example`
```
# Required
INITIAL_USERNAME=changeme
INITIAL_PASSWORD=changeme
BASE_URL=https://tailor.example.com

# Optional
DEFAULT_LOCALE=en
CURRENCY_SYMBOL=¥
MAX_UPLOAD_MB=20
NODE_ENV=production
```

---

## 14. Deploy script `scripts/deploy-ghcr.sh`

A bash script the user runs on their **dev machine** after merging to main on
GitHub. Behaviour:

1. `set -euo pipefail`.
2. Ensure on a clean working tree (`git diff --quiet`); abort otherwise.
3. `git checkout main && git fetch origin && git pull --ff-only origin main`.
4. Derive image name from `git remote get-url origin`:
   `IMAGE=ghcr.io/<owner>/<repo-lowercased>`.
5. `SHA=$(git rev-parse --short HEAD)`.
6. `docker buildx create --use --name tailor-builder` if not present.
7. `docker buildx build --platform linux/amd64,linux/arm64 \
       -t "$IMAGE:latest" -t "$IMAGE:sha-$SHA" --push .`
8. Echo: pushed `$IMAGE:latest` and `$IMAGE:sha-$SHA`.

README documents the one-time prereq: `echo $GHCR_PAT | docker login
ghcr.io -u <owner> --password-stdin` with a PAT that has `write:packages`.

The script does **not** SSH into the deploy host or restart the running
container. The user pulls and restarts on the host themselves (or wires up
Watchtower; out of scope).

---

## 15. API surface

All routes return JSON, all require auth except where noted.

| method | path                                  | purpose                               |
|--------|---------------------------------------|---------------------------------------|
| POST   | `/api/auth/login`                     | login (no auth)                       |
| POST   | `/api/auth/logout`                    | logout                                |
| POST   | `/api/auth/password`                  | change password                       |
| GET    | `/api/health`                         | liveness (no auth)                    |
| GET    | `/api/cloths`                         | list (supports `?q=&tag=&sort=&...`)  |
| POST   | `/api/cloths`                         | create                                |
| GET    | `/api/cloths/:id`                     | detail                                |
| PATCH  | `/api/cloths/:id`                     | update                                |
| DELETE | `/api/cloths/:id`                     | delete (404 if linked to projects)    |
| GET    | `/api/cloths/summary`                 | KPIs                                  |
| (same set for /patterns, /materials, /projects)                              |
| GET    | `/api/projects/:id/cost`              | computed cost breakdown               |
| POST   | `/api/photos`                         | upload (multipart)                    |
| GET    | `/api/photos/:id/:variant`            | serve (auth required)                 |
| PATCH  | `/api/photos/:id`                     | reorder / set cover                   |
| DELETE | `/api/photos/:id`                     | delete                                |
| GET    | `/api/tags`                           | list                                  |
| POST   | `/api/tags`                           | create                                |
| PATCH  | `/api/tags/:id`                       | rename / recolor                      |
| DELETE | `/api/tags/:id`                       | delete                                |
| GET    | `/api/meta/categories`                | list material categories              |
| POST   | `/api/meta/categories`                | create                                |
| PATCH  | `/api/meta/categories/:id`            | rename / reorder                      |
| DELETE | `/api/meta/categories/:id`            | delete                                |
| (same set for /meta/units)                                                   |
| GET    | `/api/backup`                         | download backup tarball               |
| POST   | `/api/backup/restore`                 | restore from tarball                  |

Conventions:
- Filtering: `?q=`, `?tags=1,2`, `?from=YYYY-MM-DD&to=YYYY-MM-DD`,
  `?sort=name|created|purchased|price`, `?dir=asc|desc`.
- All write endpoints validate input with a `zod` schema shared with the
  client form.
- Errors: `{ error: "code", message?: string, details?: any }`. HTTP codes:
  400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409
  business-rule conflict (e.g. delete cloth with active project link), 415
  unsupported media (HEIC failure), 500 unknown.

---

## 16. First-run flow

On container start `entrypoint.sh` runs:

1. **Filesystem prep**: create `/data/db`, `/data/photos/originals`,
   `/data/photos/display`, `/data/photos/thumbs`. Permissions 700 on `db`,
   755 on `photos/*`.
2. **Migrations**: apply all pending Drizzle migrations. Logs each one.
3. **Seed (idempotent)**:
   - If `users` empty, hash `INITIAL_PASSWORD` and insert user with
     `INITIAL_USERNAME`. If env vars missing, log loudly and exit non-zero.
   - For the bootstrap user, if `material_categories` is empty for that
     user_id, insert the default list.
   - Same for `material_units`.
4. **Start**: `exec node server.js` on port 3000.

---

## 17. Known compromises and caveats

The agent must not "fix" these silently. They are intentional v1 trade-offs.

- **Pattern cost is overcounted** when a pattern is used in multiple
  projects (full price added each time). Surface this in the project cost
  view if you want; do not rewrite the model.
- **HEIC** depends on sharp's libheif. Document the iPhone Most-Compatible
  workaround.
- **No CSRF token**. Single-origin, SameSite=Lax cookie. Acceptable for
  personal use behind a private proxy.
- **No login rate limit**. Reverse proxy can rate-limit if needed.
- **No automated tests** in v1. Manual acceptance per §19.
- **No service worker** — pinned-to-home behaviour is via Apple meta tags
  only.
- **Single currency**, single user, hardcoded throughout where reasonable.
- **Cloth length unit conversion in summaries**: when summing across mixed
  units, normalise everything to metres (`cm/100`, `yd*0.9144`). Do not
  refuse the sum.

---

## 18. Implementation order (suggested)

1. Repo scaffold: Next.js + TS + Tailwind + shadcn + ESLint + Prettier.
2. i18n infra (`next-intl`) with both locales wired and a smoke string.
3. Drizzle schema + migration + DB client + seed script (pre-Docker).
4. Auth (login, logout, middleware, password change) + login page.
5. Photo subsystem (upload, sharp pipeline, serve, delete).
6. **Cloths** end-to-end: list, summary, add, edit, view, delete.
7. **Patterns** end-to-end (mirrors cloths).
8. Categories and units management endpoints + Settings UI for them.
9. **Materials** end-to-end.
10. **Projects** end-to-end with consumption logic.
11. Tags + cross-tab search/filter/sort.
12. Settings: language, password, backup, restore.
13. PWA polish: icons, manifest, iOS meta, safe-area CSS.
14. Dockerfile, entrypoint, compose, deploy script.
15. End-to-end manual test pass on iPhone Safari (Add to Home Screen).

After each step: run typecheck, run dev server, smoke-test the new path.

---

## 19. Acceptance checklist

The agent is done when **all** of these are true:

- [ ] `docker compose up --build` starts the app on `127.0.0.1:3000`.
- [ ] First start with `INITIAL_USERNAME`/`INITIAL_PASSWORD` lets the user
      log in; second start reuses the same user.
- [ ] `docker compose down && up` preserves DB rows and photo files.
- [ ] All four tabs work: list, summary KPIs, add, edit, detail, delete.
- [ ] Photos: take from camera (iPhone), pick from album, reorder, set
      cover, delete, multiple per item.
- [ ] HEIC upload from iPhone succeeds (or fails clearly with the
      documented workaround).
- [ ] Cloth length and material quantity correctly decrement when a project
      consumes them, restore when the project is deleted, and reflect the
      delta when consumption is edited.
- [ ] Patterns show "used" / "never used" correctly.
- [ ] Project cost matches the formula in §10.4.
- [ ] Tags can be added inline from any item form; tag manager works.
- [ ] Material categories and units can be created and customised; defaults
      are seeded.
- [ ] Search, filter, and sort work on every tab per §9.2 table.
- [ ] Language toggle switches between English and Chinese for all
      user-facing strings; no untranslated leaks.
- [ ] Login session survives 30 days; logout clears it.
- [ ] Backup downloads a tarball; restore replaces data and the app comes
      back up healthy.
- [ ] App installed via "Add to Home Screen" on iPhone Safari opens
      standalone (no Safari chrome), respects safe areas (FAB and bottom
      nav don't sit under the home indicator).
- [ ] `scripts/deploy-ghcr.sh` builds multi-arch and pushes
      `latest` + `sha-XXXXXXX` to `ghcr.io/<owner>/<repo>`.
- [ ] All API write endpoints validate with `zod`; invalid inputs return
      HTTP 400.
- [ ] No hardcoded user-facing strings outside `messages/*.json` (except
      logs and dev-only helpers).
- [ ] Typecheck passes; ESLint passes; `next build` succeeds.

---

## 20. Notes for the implementing agent

- **Do not** add features beyond this spec. If a need surfaces, ask.
- **Do not** install `next-auth` or any heavy auth library; the
  ~80-line custom auth in §6 is intentional.
- **Do not** introduce a separate Postgres/Redis/MinIO container.
- Prefer server components and server actions where natural; use client
  components for interactive forms and the photo picker.
- The `data/` directory must be gitignored.
- Commit migration files; never edit a shipped migration.
- The agent should ask the user before pushing the first image — image
  publishing is a side effect with cost.
