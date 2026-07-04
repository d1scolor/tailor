#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: scripts/release.sh VERSION [COMMIT]" >&2
  echo "Example: scripts/release.sh 0.2.0 0123456789abcdef" >&2
  exit 2
}

[[ $# -ge 1 && $# -le 2 ]] || usage
version="${1#v}"
if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "VERSION must use MAJOR.MINOR.PATCH, for example 0.2.0" >&2
  exit 1
fi
tag="v${version}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean before creating a release tag" >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Release tags must be created from the main branch" >&2
  exit 1
fi

git fetch origin main:refs/remotes/origin/main --tags
if [[ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]]; then
  echo "Local main must match origin/main before creating a release tag" >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  echo "Tag $tag already exists" >&2
  exit 1
fi

commit="$(git rev-parse "${2:-HEAD}^{commit}")"
if ! git merge-base --is-ancestor "$commit" origin/main; then
  echo "$commit is not part of origin/main" >&2
  exit 1
fi

remote="$(git remote get-url origin)"
case "$remote" in
  git@github.com:*.git)
    slug="${remote#git@github.com:}"
    ;;
  ssh://git@github.com/*.git)
    slug="${remote#ssh://git@github.com/}"
    ;;
  https://github.com/*)
    slug="${remote#https://github.com/}"
    ;;
  *)
    echo "Unsupported GitHub remote URL: $remote" >&2
    exit 1
    ;;
esac
slug="${slug%.git}"
image="ghcr.io/$(printf '%s' "$slug" | tr '[:upper:]' '[:lower:]')"
image_ref="${image}:sha-${commit}"

if ! docker buildx imagetools inspect "$image_ref" >/dev/null 2>&1; then
  echo "The tested image does not exist: $image_ref" >&2
  echo "Wait for the main CI run to finish successfully before releasing." >&2
  exit 1
fi

echo "Release: $tag"
echo "Commit:  $commit"
echo "Image:   $image_ref"
git show --no-patch --format='Subject: %s%nDate:    %cI' "$commit"
read -r -p "Create and push this release tag? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Release cancelled"
  exit 1
fi

git tag -a "$tag" -m "Tailor $tag" "$commit"
git push origin "$tag"

echo "Pushed $tag. Follow the Release workflow in GitHub Actions."
