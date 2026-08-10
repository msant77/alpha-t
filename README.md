# Alpha T — public home

Public face of **Alpha T** (alphatester.app): the landing page, the apps
distribution page, and the release assets for apps distributed with Alpha T.
The product source lives elsewhere; this repo holds only public content.

## Layout

| Path | Serves |
|------|--------|
| `index.html` | alphatester.app (landing) |
| `apps/index.html` | apps.alphatester.app (apps & downloads) |

Deployed to Cloudflare Pages. Large binaries are **never committed** —
they are attached to GitHub Releases here.

## Releases

One repo, several apps — tags are prefixed per app:

```
cutavid-v1.2.0
<app>-v<semver>
```

Each release carries the platform zips (e.g. `cutavid-windows-x64-v1.2.0.zip`)
with SHA-256 published on the apps page. Download links on the pages must be
verified before going live (status + size + `PK` magic bytes) — a missing
file behind a Pages route serves the index with HTTP 200 and downloads HTML
disguised as a zip.

## Apps

- **Cut A Vid** — video cut & compose for Windows (Flutter + bundled ffmpeg).
