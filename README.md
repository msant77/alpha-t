# Alpha Tester — public home

Public face of **Alpha Tester** (alphatester.app): the landing page, the apps
distribution page, and the release assets for apps distributed with Alpha Tester.
The product source lives elsewhere; this repo holds only public content.

## Layout

| Path | Serves |
|------|--------|
| `index.html` | alphatester.app (landing) |
| `como-funciona/index.html` | alphatester.app/como-funciona/ (how it works, one live scene per step) |
| `precos/index.html` | alphatester.app/precos/ (pricing: plans and credits) |
| `assets/` | styles, scripts, fonts, vendored libraries and client logos shared by the pages above |

The landing and "Como funciona" use root-relative paths (`/assets/…`,
`/como-funciona/`), so their deploy must carry `assets/`, `como-funciona/`,
`precos/`, `en/` and `es/` next to `index.html`. No build step.

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

## Languages

pt-BR (default), en and es. Every visible string, scene captions and log
lines included, lives in `assets/i18n/<locale>.json` with the same keys;
markup carries `data-i18n` keys and the scene data (`assets/scenes.js`)
holds ids only. `assets/i18n.js` picks the locale (`?lang=`, then the
entry page, then the saved choice, then the browser languages, then
pt-BR) and the header switcher re-renders in place.

```
node scripts/i18n-check.mjs   # gate: fails if a key is missing or differs in kind
node scripts/i18n-pages.mjs   # rewrites en/ and es/ entry pages from the pt-BR pages
                              # and copies the locale files into apps/ (its own site root)
```

Run `i18n-pages.mjs` after editing `index.html`, `como-funciona/`, `precos/` or a
locale file, and commit its output. The generated pages under `en/` and
`es/` are never edited by hand. The apps privacy page stays pt-BR.

## Palettes

`assets/site.css` defines two named palettes as CSS custom properties on
`:root`, sampled from the brand swatches: light **sage / charcoal /
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
