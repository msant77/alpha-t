# Alpha Tester — public home

Public face of **Alpha Tester** (alphatester.app): the landing page, the apps
distribution page, and the release assets for apps distributed with Alpha Tester.
The product source lives elsewhere; this repo holds only public content.

## Layout

| Path | Serves |
|------|--------|
| `index.html` | alphatester.app (landing) |
| `como-funciona/index.html` | alphatester.app/como-funciona/ (how it works, one live scene per step) |
| `assets/` | styles, scripts, fonts, vendored libraries and client logos shared by the two pages above |
| `apps/index.html` | apps.alphatester.app (apps & downloads) |

The landing and "Como funciona" use root-relative paths (`/assets/…`,
`/como-funciona/`), so their deploy must carry `assets/` and
`como-funciona/` next to `index.html`. No build step.

## Scenes

The pages are interaction-first: the animations are the content and the
text appears when someone points at, taps or tabs to an object.

| File | Role |
|------|------|
| `assets/scenes.js` | Every story as data: the hero loop (nodes, edges, steps, a timed list of events, captions, log lines) and the captions and task logs of each Como funciona card. Edit the story here. |
| `assets/loop.js` | Story engine: timeline, counters, session log, progress rail, captions, keyboard proxies; flat HTML/SVG view for no WebGL and reduced motion. |
| `assets/hero3d.js` | The hero in 3D (three.js): cards on a ring, curved edges, lit packets, camera drift, focus on selection. |
| `assets/como.js` | Como funciona: one GSAP timeline per card, task logs, fixed progress rail. |
| `assets/vendor/` | three.js r169 (MIT) and GSAP 3.13.0 (GSAP standard licence), pinned. |
| `assets/fonts/` | Cormorant Garamond and JetBrains Mono, woff2, SIL OFL 1.1 (licences alongside). |

Scenes pause when the tab is hidden or they are off screen, have a
"pausar" control, and under `prefers-reduced-motion` draw their final
frame with captions still interactive.

## Palettes

`assets/site.css` defines two named palettes as CSS custom properties on
`:root`, sampled from the owner's swatches: light **sage / charcoal /
oatmeal** and dark **peacock / tobacco / parchment**, plus one gold from
the swatches' lettering. The system preference picks one; the header
toggle overrides it per browser (`localStorage`). Every text, link and
button pair passes WCAG AA; the ratios are in the stylesheet's comments,
and every colour of the scenes (3D included) comes from these variables.

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
