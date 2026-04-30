#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

port="${PORT:-3000}"
host="${HOST:-127.0.0.1}"
log_file="${DEV_LOG:-.dev-server/dev-server.log}"
pid_file="${DEV_PID:-.dev-server/dev-server.pid}"
next_bin="./node_modules/.bin/next"
next_cli="$(pwd)/node_modules/next/dist/bin/next"
node_bin="${NODE_BIN:-$(command -v node || true)}"
foreground="${DEV_FOREGROUND:-0}"
launcher="${DEV_LAUNCHER:-auto}"
launchd_label="${DEV_LAUNCHD_LABEL:-com.tailor.dev}"
launchd_plist="$(pwd)/.dev-server/${launchd_label}.plist"

abs_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$(pwd)" "$1" ;;
  esac
}

xml_escape() {
  local value="$1"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  value="${value//\"/&quot;}"
  value="${value//\'/&apos;}"
  printf '%s\n' "$value"
}

stop_pid() {
  local pid="$1"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" >/dev/null 2>&1; then
    return
  fi
  kill "$pid" >/dev/null 2>&1 || true
  sleep 1
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
}

if [[ -f "$pid_file" ]]; then
  stop_pid "$(cat "$pid_file")"
  rm -f "$pid_file"
fi

if [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/$launchd_label" >/dev/null 2>&1 || true
  launchctl remove "$launchd_label" >/dev/null 2>&1 || true
fi

if command -v lsof >/dev/null 2>&1; then
  while IFS= read -r pid; do
    stop_pid "$pid"
  done < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
fi

mkdir -p "$(dirname "$log_file")" "$(dirname "$pid_file")"

if [[ ! -x "$next_bin" ]]; then
  echo "Missing $next_bin. Run npm install first." >&2
  exit 1
fi

if [[ "$foreground" == "1" ]]; then
  echo "Dev server starting at http://$host:$port"
  exec "$next_bin" dev --hostname "$host" --port "$port"
fi

start_with_launchd() {
  if [[ -z "$node_bin" ]] || [[ ! -x "$node_bin" ]]; then
    echo "Cannot find node. Set NODE_BIN=/absolute/path/to/node." >&2
    exit 1
  fi
  if [[ ! -f "$next_cli" ]]; then
    echo "Missing $next_cli. Run npm install first." >&2
    exit 1
  fi

  cat >"$launchd_plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$(xml_escape "$launchd_label")</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml_escape "$node_bin")</string>
    <string>$(xml_escape "$next_cli")</string>
    <string>dev</string>
    <string>--hostname</string>
    <string>$(xml_escape "$host")</string>
    <string>--port</string>
    <string>$(xml_escape "$port")</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$(xml_escape "$(pwd)")</string>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$(xml_escape "$(abs_path "$log_file")")</string>
  <key>StandardErrorPath</key>
  <string>$(xml_escape "$(abs_path "$log_file")")</string>
</dict>
</plist>
PLIST

  launchctl bootstrap "gui/$(id -u)" "$launchd_plist"
}

if [[ "$launcher" == "launchd" ]] || { [[ "$launcher" == "auto" ]] && [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; }; then
  start_with_launchd
else
  nohup "$next_bin" dev --hostname "$host" --port "$port" </dev/null >"$log_file" 2>&1 &
  server_pid="$!"
  echo "$server_pid" >"$pid_file"
fi

for _ in {1..30}; do
  if [[ -n "${server_pid:-}" ]] && ! kill -0 "$server_pid" >/dev/null 2>&1; then
    echo "Dev server exited before it was ready." >&2
    tail -n 80 "$log_file" >&2 || true
    exit 1
  fi
  if curl -sI "http://$host:$port/login" >/dev/null 2>&1; then
    if command -v lsof >/dev/null 2>&1; then
      lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 >"$pid_file" || true
    fi
    echo "Dev server running at http://$host:$port"
    echo "Log: $log_file"
    if [[ -s "$pid_file" ]]; then echo "PID: $(cat "$pid_file")"; fi
    if [[ -f "$launchd_plist" ]]; then echo "LaunchAgent: $launchd_plist"; fi
    exit 0
  fi
  sleep 1
done

echo "Dev server did not become ready at http://$host:$port." >&2
tail -n 80 "$log_file" >&2 || true
exit 1
