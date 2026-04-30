#!/usr/bin/env bash
set -euo pipefail

git diff --quiet
git checkout main
git fetch origin
git pull --ff-only origin main

remote="$(git remote get-url origin)"
case "$remote" in
  git@github.com:*.git)
    slug="${remote#git@github.com:}"
    slug="${slug%.git}"
    ;;
  ssh://git@github.com/*.git)
    slug="${remote#ssh://git@github.com/}"
    slug="${slug%.git}"
    ;;
  https://github.com/*.git)
    slug="${remote#https://github.com/}"
    slug="${slug%.git}"
    ;;
  https://github.com/*)
    slug="${remote#https://github.com/}"
    slug="${slug%.git}"
    ;;
  *)
    echo "Unsupported GitHub remote URL: $remote" >&2
    exit 1
    ;;
esac
owner="${slug%%/*}"
repo="${slug#*/}"
owner="$(printf '%s' "$owner" | tr '[:upper:]' '[:lower:]')"
repo="$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')"
image="ghcr.io/${owner}/${repo}"
sha="$(git rev-parse --short HEAD)"

if ! docker buildx inspect tailor-builder >/dev/null 2>&1; then
  docker buildx create --use --name tailor-builder
else
  docker buildx use tailor-builder
fi

docker buildx build --platform linux/amd64,linux/arm64 -t "$image:latest" -t "$image:sha-$sha" --push .
echo "pushed $image:latest"
echo "pushed $image:sha-$sha"
