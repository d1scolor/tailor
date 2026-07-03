#!/usr/bin/env bash
set -euo pipefail
umask 077

mkdir -p /data/db /data/photos/originals /data/photos/display /data/photos/thumbs
chmod 700 /data/db
chmod 700 /data/photos /data/photos/originals /data/photos/display /data/photos/thumbs

node /app/scripts/bootstrap.mjs
export HOSTNAME=0.0.0.0
exec node /app/server.js
