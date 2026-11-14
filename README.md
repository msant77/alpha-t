# Alpha Tester — public home

Public face of **Alpha Tester** (alphatester.app): the landing page, the apps
distribution page, and the release assets for apps distributed with Alpha Tester.
The product source lives elsewhere; this repo holds only public content.

## Layout

| Path | Serves |
|------|--------|
| `index.html` | alphatester.app (landing) |
| `como-funciona/index.html` | alphatester.app/como-funciona/ (how it works, with diagrams) |
| `assets/` | styles, theme toggle, favicon and client logos shared by the two pages above |
| `apps/index.html` | apps.alphatester.app (apps & downloads) |

The landing and "Como funciona" use root-relative paths (`/assets/…`,
`/como-funciona/`), so their deploy must carry `assets/` and
`como-funciona/` next to `index.html`.

## Palettes

`assets/site.css` defines two named palettes as CSS custom properties on
`:root`, one per theme: light **sage / charcoal / oatmeal** and dark
**peacock / tobacco / parchment**. The system preference picks one; the
header toggle overrides it per browser (`localStorage`). Every text, link
and button pair passes WCAG AA; the ratios are in the stylesheet's
comments, so a new colour is checked before it lands.

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
