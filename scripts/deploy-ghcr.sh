#!/usr/bin/env bash
set -euo pipefail

git diff --quiet
git checkout main
git fetch origin
git pull --ff-only origin main

remote="$(git remote get-url origin)"
repo="$(basename "$remote" .git | tr '[:upper:]' '[:lower:]')"
owner="$(dirname "$remote")"
owner="$(basename "$owner" | tr '[:upper:]' '[:lower:]')"
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
