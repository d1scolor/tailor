# Security policy

## Supported versions

Security fixes are provided for the latest release and the current `main`
branch. Older images and commits may contain known vulnerabilities and are not
supported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's **Report a vulnerability** button in the repository Security tab
to submit a private security advisory. Include affected versions, deployment
conditions, reproduction steps, impact, and any suggested mitigation.

If private vulnerability reporting is unavailable, open a minimal public issue
asking the maintainer to enable a private reporting channel without including
security-sensitive details.

## Deployment expectations

For internet access, Tailor should be deployed behind an HTTPS reverse proxy
with the container port bound to loopback. Direct HTTP access is intended only
for a trusted private network or VPN. Protect the Docker host, `.env`, backups,
and `/data` volume; each contains credentials or private inventory data.
