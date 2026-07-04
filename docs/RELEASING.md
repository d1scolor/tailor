# Releasing Tailor

Tailor uses two container channels:

| Channel     | Container tag | Purpose                                     |
| ----------- | ------------- | ------------------------------------------- |
| Development | `edge`        | Newest successfully published tip of `main` |
| Stable      | `latest`      | Newest release recommended to users         |

Every successful `main` build also has an immutable
`sha-<full-commit-sha>` tag. Stable releases promote one of those already-built
images; they do not rebuild it.

## One-time GitHub setup

1. Enable GitHub Actions for the repository.
2. Open the existing `d1scolor/tailor` package from the **Packages** tab on the
   `d1scolor` profile.
3. Select **Connect repository** and connect `d1scolor/tailor`.
4. In **Package settings**, add `d1scolor/tailor` under **Manage Actions
   access** with write access.
5. Make the package public when the repository is ready to become public.
6. After testing the first automated release, enable release immutability under
   **Repository settings → General → Releases**.

The workflows use the repository's short-lived `GITHUB_TOKEN`; no personal
access token or repository secret is required.

## Development images from main

The `CI` workflow runs for pull requests and every push to `main`. It performs
type checking, linting, tests, a production build, and an audit.

After those checks pass on `main`, it builds and pushes a multi-platform image
for `linux/amd64` and `linux/arm64` as:

```text
ghcr.io/d1scolor/tailor:sha-<full-commit-sha>
```

If that commit is still the tip of `main`, the workflow also moves:

```text
ghcr.io/d1scolor/tailor:edge
```

If `main` advances while an older image is building, the immutable SHA image is
still published, but the older build cannot move `edge` backwards.

To test development builds on a private deployment, set:

```dotenv
TAILOR_IMAGE=ghcr.io/d1scolor/tailor:edge
```

Then deploy deliberately:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Use a `sha-*` tag instead when the exact deployed commit must remain pinned.
The public Compose example continues to use `latest`.

## Create a stable release

Choose a semantic version following `MAJOR.MINOR.PATCH`. From a clean, current
`main` checkout, run:

```bash
scripts/release.sh 0.2.0
```

The default is the current commit. To release an earlier tested commit that is
part of `main`, pass its SHA:

```bash
scripts/release.sh 0.2.0 <full-commit-sha>
```

The helper verifies that:

- the working tree is clean;
- local `main` matches `origin/main`;
- the version tag is unused;
- the commit belongs to `main`; and
- the corresponding `sha-*` image exists in GHCR.

After confirmation, it creates and pushes the annotated `v0.2.0` Git tag.

## What the Release workflow does

Pushing a stable `vMAJOR.MINOR.PATCH` tag triggers the `Release` workflow. It:

1. validates the tag and requires it to be annotated;
2. confirms the commit belongs to `main`;
3. finds the already-tested `sha-*` image;
4. refuses to overwrite an existing version tag with different content;
5. promotes the same image to `0.2.0`, advances `0.2` when it is the newest
   patch in that series, and advances `latest` when it is the highest stable
   version; and
6. creates a GitHub Release with generated notes and marks it as latest when it
   is the highest stable version.

All container tags above point to the same multi-platform image digest.
Published Git tags and exact container version tags must never be moved to
different content. Fix a bad release with a new patch version.

Stable releases only are currently automated. Tags such as `v0.3.0-rc.1` are
rejected until a prerelease channel is intentionally added.

## Release notes

GitHub generates notes from merged pull requests using `.github/release.yml`.
Direct commits may require a short manual summary.

Edit notes from **Repository → Releases → Edit**, or with:

```bash
gh release view v0.2.0
gh release edit v0.2.0 --notes-file release-notes.md
```

Call out new environment variables, migration considerations, backup
requirements, and known issues. Editing release notes does not change the Git
tag or container image.

## Retry or promote a release

The Release workflow can be run manually from **Actions → Release → Run
workflow** with an existing tag such as `v0.2.0`.

This operation is idempotent when the version already points to the expected
image. It can:

- retry a partially failed release;
- restore an older stable release as GitHub's latest release; and
- move the GHCR `latest` tag to that same older image.

It does not alter the immutable version tag, move a minor-series tag backwards,
or rebuild the image.

## Data safety

`edge` is intended for maintainer testing and can contain forward database
migrations. Back up production data before deploying it. Moving the container
back to an older SHA does not reverse database migrations.

## Troubleshooting

### Package push is denied

The existing GHCR package was originally pushed manually. Confirm that it is
connected to `d1scolor/tailor` and that the repository has write access under
**Manage Actions access**.

### The release image does not exist

Wait for the selected commit's `CI` workflow to finish successfully. A failed
or cancelled `main` build does not produce a releasable SHA image.

### Image tags were promoted but the GitHub Release failed

Run the Release workflow manually with the same version tag. It preserves
existing release notes and refuses to replace a version tag with different
image content.
