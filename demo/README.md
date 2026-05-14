# Test Data Factory — Demo

Live promo for [`@mosaic-code/test-data-factory`](https://github.com/mosaic-code-coop/test-data-api). Single-page Vue 3 app deployed to GitHub Pages at `https://mosaic-code-coop.github.io/test-data-api/`.

## What it does

- Pick between two test-data libraries: STEM women/trans/BIPOC (default) and First Nations activists
- Shows a single profile at a time (name, photo, bio, pronouns, tags, quote)
- Next / Previous / Random navigation
- Click a group or event chip to see its members inline
- URL records `?library=` and `?person=`, so any profile is bookmark-able
- "See something incorrect?" deep-links to the library's New Issue page, pre-filled with the permalink

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:5173/test-data-api/

## Build

```bash
npm run build      # vue-tsc + vite build into dist/
npm run preview    # serve dist/ at http://localhost:4173/test-data-api/
```

## Data loading

At runtime the demo tries to load each library from `https://esm.sh/<pkg>@latest` first, then falls back to bundled JSON in `public/data/<pkg>.json`. If you change the libraries, regenerate the fallback JSON:

```bash
# Requires sibling repos checked out at ../../test-data-stem-women-trans-bipoc and ../../test-data-first-nations-activists
npm install --no-save ../../test-data-stem-women-trans-bipoc ../../test-data-first-nations-activists
npm run bundle-data
```

The output `public/data/*.json` is committed to the repo.

## Regenerating the social preview image

`public/og-image.png` is a 1200x630 grayscale collage of 20 STEM portraits. To regenerate:

```bash
npm run generate-og
```

Source images are cached in `scripts/.cache/` (gitignored). Tune cropping by adding `extractRegion` entries per-photo in `scripts/generate-og.mjs` and re-running — cached sources skip the network.

## Playwright smoke tests

Local-only; not run in CI (demo changes rarely). First-time setup:

```bash
npx playwright install --with-deps chromium
```

Then:

```bash
npm run test:playwright
```

The tests cover initial render, library switching + acknowledgment modal, next/prev/random navigation, deep-link round-tripping, and the issue link contents.

## Deployment

Pushing to `main` with changes under `demo/**` triggers `.github/workflows/deploy-demo.yml`, which builds the demo and deploys via GitHub Actions Pages.

**One-time repo setup** (do this once in the repo Settings):

1. Settings → Pages → Source: **GitHub Actions**

That's it. No `gh-pages` branch needed.

## First Nations acknowledgment

The First Nations library cannot be loaded until the user confirms they understand it contains names and images of First Nations persons, some of whom may be deceased. The confirmation is per-tab (`sessionStorage`); closing the tab re-prompts.

## Acknowledged limitations

- `esm.sh @latest` caches for ~10 minutes after a new publish. Library updates take that long to reflect in the live demo.
- `og:image` is an absolute URL hardcoded to `https://mosaic-code-coop.github.io/test-data-api/og-image.png`; if the org/repo is renamed update `index.html` and `useFactory.ts` (issue-link permalink).
