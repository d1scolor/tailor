# Contributing

Forks and independent improvements are welcome. This repository does not
accept pull requests. Bug reports may be submitted through GitHub issues, but
maintainers are not obligated to implement or merge proposed changes.

## Development

Use Node.js 24 LTS and install the locked dependency tree:

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run dev
```

Use a temporary `DATA_DIR` when testing migrations. Never commit local
databases, photos, backups, credentials, or `.env` files.

## Before opening a pull request

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

User-facing text must be translated in every catalog under `messages/`.
Database changes must use forward-only migrations that preserve existing data.

## Security reports

Follow [SECURITY.md](SECURITY.md). Do not disclose vulnerabilities in public
issues before a fix is available.
