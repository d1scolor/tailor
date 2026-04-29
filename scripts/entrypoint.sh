#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data/db /data/photos/originals /data/photos/display /data/photos/thumbs
chmod 700 /data/db
chmod 755 /data/photos /data/photos/originals /data/photos/display /data/photos/thumbs

node /app/scripts/bootstrap.mjs
exec node /app/server.js
