#!/usr/bin/env bash
set -euo pipefail

port="${PORT:-3000}"
host="${HOST:-127.0.0.1}"
log_file="${DEV_LOG:-.next/dev-server.log}"
pid_file="${DEV_PID:-.next/dev-server.pid}"

pkill -f "next dev" >/dev/null 2>&1 || true

mkdir -p "$(dirname "$log_file")" "$(dirname "$pid_file")"

nohup npm run dev -- --hostname "$host" --port "$port" </dev/null >"$log_file" 2>&1 &
echo "$!" >"$pid_file"
echo "Dev server restarting at http://$host:$port"
echo "Log: $log_file"
echo "PID: $(cat "$pid_file")"
