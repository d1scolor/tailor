# Tailor

Personal sewing inventory for fabrics, patterns, materials, and finished projects.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

The app uses SQLite under `./data/db/tailor.db` and stores photos under `./data/photos`.
Before the first start, set `INITIAL_USERNAME`, `INITIAL_PASSWORD`, `DEFAULT_LOCALE`,
`DEFAULT_UNIT_SYSTEM`, and `CURRENCY_CODE` in `.env`.

Supported locales are `en-AU`, `en-GB`, `en-US`, `zh-CN`, `zh-TW`, `zh-HK`,
`fr`, `de`, `ja`, `ko`, `it`, `es`, `pt-BR`, `nl`, and `pl`. The legacy values
`en` and `zh` resolve to `en-AU` and `zh-CN`. English uses one Australian English
message catalog while retaining regional date, number, and currency formatting.
Traditional Chinese has separate Taiwan and Hong Kong catalogs so terminology
can differ without changing stored data.

Supported unit systems are `metric` and `imperial`. Supported currencies are
`USD`, `AUD`, `GBP`, `EUR`, `CNY`, `JPY`, `KRW`, `HKD`, `TWD`, `CAD`, `NZD`,
`SGD`, `CHF`, `PLN`, `SEK`, `NOK`, `DKK`, `BRL`, `MXN`, `INR`, and `ZAR`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The container listens on `127.0.0.1:3000`. Put Caddy, nginx, or another reverse proxy in front of it for HTTPS.

First boot creates a user from `INITIAL_USERNAME` and `INITIAL_PASSWORD`. Later
boots keep the existing user and ignore those bootstrap credentials. Locale,
unit system, and currency are stored per user; the environment values only
provide defaults when a preference has not yet been initialized.

Currency remains singular within each user's inventory rather than being stored
per item. Changing it after prices have been saved requires explicit
confirmation: existing numeric amounts are reinterpreted in the new currency
without conversion or rewriting monetary records. Switching to a zero-decimal currency
such as JPY or KRW hides stored decimal fractions while that currency is active.

Set the correct `CURRENCY_CODE` before upgrading an existing installation to the
user-currency migration. Legacy `CURRENCY_SYMBOL` values are recognized during
that one-time initialization, but `CURRENCY_CODE` is unambiguous and preferred.

## Photos and HEIC

Uploads accept JPEG, PNG, WebP, HEIC, and HEIF. If HEIC decoding fails on your platform, set iPhone **Settings -> Camera -> Formats -> Most Compatible** so the camera roll sends JPEG instead.

## Backup and restore

Settings includes a backup download and restore upload. Restore requires typing `RESTORE` and replaces the current database and photos after validating the uploaded SQLite database.

## Security notes

Tailor is intended for a single user behind a private reverse proxy. It uses an HttpOnly SameSite=Lax session cookie and does not include a CSRF token or login rate limit in v1.

Project cost intentionally counts each linked pattern at full price every time it is used.

## Publishing to GHCR

One-time login:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u <owner> --password-stdin
```

Then publish from a clean `main` checkout:

```bash
scripts/deploy-ghcr.sh
```
