# Tailor

Personal sewing inventory for fabrics, patterns, materials, and finished projects.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

The app uses SQLite under `./data/db/tailor.db` and stores photos under `./data/photos`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The container listens on `127.0.0.1:3000`. Put Caddy, nginx, or another reverse proxy in front of it for HTTPS.

First boot creates a user from `INITIAL_USERNAME` and `INITIAL_PASSWORD`. Later boots keep the existing user and ignore those bootstrap credentials.

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
