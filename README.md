# Tailor

Tailor is a self-hosted sewing inventory application for fabrics, patterns,
materials, projects, and tools. It is designed for one user and stores all data
in a local SQLite database with photos on disk.

## Features

- Inventory-specific fields, sorting, filtering, tags, photos, and duplication
- Project links to fabrics, patterns, and materials
- Fabric consumption and project cost calculations
- Metric and imperial display units
- Multiple interface languages and currencies
- Browser-based backup and restore
- Responsive PWA interface for desktop and mobile browsers

## Deployment model

Tailor runs as one Docker container with one persistent `/data` volume. It does
not require an external database, object store, cache, or queue.

The Compose configuration binds the application to `127.0.0.1:3000`. Keep that
loopback binding and place an HTTPS reverse proxy such as Caddy, nginx, or
Traefik in front of it. Do not expose the container port directly to the
internet.

### Requirements

- Docker Engine with Docker Compose v2
- An HTTPS reverse proxy for non-local access
- A persistent Docker volume or bind mount for `/data`

### Configure

```bash
cp .env.example .env
chmod 600 .env
```

Set a unique username, a password of at least 12 characters, and the public
HTTPS URL before starting the container. Tailor has no default credentials.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `INITIAL_USERNAME` | First boot | none | Creates the first and only user |
| `INITIAL_PASSWORD` | First boot | none | Initial password; 12–72 UTF-8 bytes |
| `BASE_URL` | Yes | none | Public origin used for cross-origin request checks |
| `TAILOR_IMAGE` | No | `tailor:local` | Image used by Compose |
| `DEFAULT_LOCALE` | No | `en-AU` | Initial interface locale |
| `DEFAULT_UNIT_SYSTEM` | No | `metric` | `metric` or `imperial` |
| `CURRENCY_CODE` | No | `USD` | Initial ISO 4217 currency code |
| `MAX_UPLOAD_MB` | No | `20` | Maximum photo upload size |
| `MAX_BACKUP_MB` | No | `4096` | Maximum compressed and extracted restore size |

Bootstrap credentials are ignored after the first user is created. Change the
password in Settings after the first login. Anyone with access to the Docker
daemon or the deployment environment can read container environment variables,
so restrict host access and protect `.env`.

### Build locally

```bash
docker compose up -d --build
docker compose ps
```

### Run a GHCR image

Set the public image in `.env`:

```dotenv
TAILOR_IMAGE=ghcr.io/OWNER/REPOSITORY:latest
```

Then pull and start without rebuilding:

```bash
docker compose pull
docker compose up -d --no-build
```

Images published from this repository support `linux/amd64` and `linux/arm64`.
Prefer an immutable version or `sha-*` tag when repeatable deployments matter.

### Reverse proxy

Proxy HTTPS traffic to `http://127.0.0.1:3000` and preserve the original `Host`
and scheme headers. Set the proxy request-body limit at least as high as the
largest photo or backup you intend to restore.

Example Caddy configuration:

```caddyfile
tailor.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Set `BASE_URL=https://tailor.example.com` to the same public origin.

### Persistent data

Compose creates the named volume `tailor-data`, mounted at `/data`:

```text
/data/db/tailor.db
/data/photos/originals/
/data/photos/display/
/data/photos/thumbs/
```

To use a bind mount instead, replace `tailor-data:/data` with
`./data:/data`. The directory must be writable by UID/GID `1000:1000`, because
the application runs as the unprivileged `node` user.

Do not delete or replace `/data` during an upgrade.

## Backup and restore

Settings can download a `.tar.gz` backup and restore one created by Tailor.
Backups contain the password hash, inventory, and original photos and must be
handled as sensitive data. Active session tokens are removed from exported
backups, and restoring a backup invalidates all sessions.

Restore validates archive paths, entry types, size, SQLite integrity, required
tables, and migrations before replacing live data. The previous data directory
is retained under `/data/restore-backup-*` for emergency rollback; remove old
restore backups from the Docker host after verifying a successful restore.
Backups from pre-public development builds are not supported by the public
schema baseline.

For large installations, also take host-level snapshots of the entire `/data`
volume while the container is stopped.

## Upgrades

Back up Tailor first. For GHCR deployments:

```bash
docker compose pull
docker compose up -d --no-build
```

For local builds:

```bash
git pull --ff-only
docker compose up -d --build
```

Database migrations run automatically during container startup.

## Local development

Use Node.js 24 LTS.

```bash
cp .env.example .env
npm ci
npm run db:migrate
npm run dev
```

The development server uses `./data` by default.

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

## Internationalisation and units

Supported locales are `en-AU`, `en-GB`, `en-US`, `zh-CN`, `zh-TW`, `zh-HK`,
`fr`, `de`, `ja`, `ko`, `it`, `es`, `pt-BR`, `nl`, and `pl`.

Supported unit systems are `metric` and `imperial`. Supported currencies are
defined in `src/lib/currency-config.json`. Currency is a display interpretation
for all inventory values; changing it does not convert stored amounts.

## Security model

Tailor is single-user software intended to run behind an HTTPS reverse proxy.
It uses bcrypt password hashes, random server-side sessions, Secure HttpOnly
SameSite cookies in production, cross-origin mutation checks, and bounded login
attempts. The container runs without Linux capabilities as a non-root user.
The login limiter is process-local, so internet-facing deployments should also
rate-limit `/api/auth/login` at the reverse proxy.

The unprotected `/api/health` endpoint only reports process availability.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and supported
versions.

## Contributing

Forks and independent improvements are welcome. This repository does not accept
pull requests; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Tailor is licensed under the [GNU Affero General Public License version 3
only](LICENSE) (`AGPL-3.0-only`).

You may use, modify, redistribute, and charge for Tailor or a hosted Tailor
service. Modified versions used over a network must offer their corresponding
source code to their users under the same license. Copyright and license
notices must be preserved. The canonical source is
[github.com/d1scolor/tailor](https://github.com/d1scolor/tailor).
