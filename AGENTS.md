# Tailor Agent Guide

Tailor is a personal sewing inventory app for one user. It is deployed as a single Next.js container backed by SQLite and local photo files under `/data`.

## Commands

- `npm run typecheck`: TypeScript check.
- `npm run lint`: ESLint plus the no-hardcoded-JSX i18n check.
- `npm run build`: production Next.js build.
- `npm run db:migrate`: run SQLite migrations.
- `npm run dev:restart`: restart the local dev server at `http://127.0.0.1:3000`.
- `scripts/deploy-ghcr.sh`: from a clean `main`, build and push `ghcr.io/<owner>/<repo>:latest` plus `sha-<shortsha>`.

When changing behavior, run at least `npm run typecheck` and `npm run lint`. Run `npm run build` for route/schema/UI changes. Run a temporary `DATA_DIR=... npm run db:migrate` when migrations or DB bootstrap code change.

## Architecture

- Framework: Next.js App Router with TypeScript.
- UI: Tailwind classes, local primitives in `src/components/ui`, Lucide icons.
- i18n: `next-intl` with locale catalogs under `messages/`.
- Data: SQLite through `better-sqlite3`; main access layer is `src/lib/repository.ts`.
- Schema validation: Zod schemas in `src/lib/schemas`.
- Auth: HttpOnly session cookie; middleware performs cheap cookie-shape gating, API/layout code validates sessions.
- Photos: DB rows in `photos`; files in `data/photos/{originals,display,thumbs}`. Do not reuse photo rows across entities.

## Inventory Model

Supported inventory tabs are:

- `fabrics`
- `patterns`
- `materials`
- `projects`
- `tools`

The shared client is `src/components/inventory-client.tsx`. Prefer extending that shared surface over creating separate UI implementations unless the workflow is genuinely different.

Projects are special: they link to fabrics, patterns, and materials, consume remaining stock, and calculate costs. Avoid copying project logic to other item types. Be careful with changes to `src/lib/consumption.ts` and project cost calculation.

## Database And Migrations

- Migrations live in `src/lib/db/migrations` and are applied lexicographically.
- `src/lib/db/schema-requirements.json` defines the minimum supported schema and rejects incomplete legacy databases.
- `scripts/bootstrap.mjs` also runs migrations during container boot.
- New enum-like fields should store stable ASCII keys in SQLite and use i18n for display labels.
- Existing data must be migrated forward with a new migration; do not require destructive DB resets for normal feature work.

## API Conventions

- Route handlers live under `src/app/api/<kind>`.
- CRUD routes should call `requireAuthFromRequest`, validate params/body with Zod, and return through `ok`/`handleApiError`.
- Use repository helpers for ownership checks and item mutations. Do not hand-roll parallel SQL in route handlers unless the route is intentionally narrow.
- Per-user ownership matters even though the app is single-user in practice.

## UI Conventions

- Keep operational screens dense and practical. This is an inventory tool, not a marketing page.
- Use existing components and patterns in `inventory-client.tsx`.
- Keep mobile Safari behavior in mind: inputs should remain at 16px or larger, touch targets should be comfortable, and bottom sheets should avoid being hidden by the tab bar.
- Modals that need to cover the whole viewport should be rendered through the body portal pattern already in `inventory-client.tsx`.
- Do not add visible instructional copy unless the user specifically asks for it.

## i18n Rules

- User-facing text must be added to every locale catalog under `messages/`.
- The lint script checks hardcoded JSX text.
- Stored DB values for app-controlled option sets should be language-neutral keys, not translated labels.
- Free-text user fields can remain exactly as typed.

## Photos

- Uploads are processed by `src/lib/images.ts`.
- Each photo has an original file and generated `display`/`thumb` WebP files.
- Deleting an item must delete its photo rows and files.
- Duplicating an item must create new photo IDs and copy the files, not link to the original photo rows.

## Backup, Restore, And Data Safety

- Backup/restore lives under `src/app/api/backup`.
- Restore replaces the DB and photos directory after validation and should block concurrent writes through the restore state mechanism.
- Do not run destructive commands against `data/` unless the user explicitly asks.

## Deployment

- Docker image is built for `linux/amd64` and `linux/arm64`.
- Runtime data is mounted at `/data`.
- First boot uses `INITIAL_USERNAME` and `INITIAL_PASSWORD`; later boots keep the existing user.
- The app is expected to sit behind the user's reverse proxy.

## Git And Commits

- Work on a branch for each change unless the user explicitly says otherwise.
- Do not revert user changes.
- Commit messages should be verbose by default:
  - Subject: concise, imperative, 72 characters or fewer.
  - Body: explain why, what changed, caveats, and verification performed.
