#!/usr/bin/env node
// Generates public/og-image.png — 1200x630 grayscale 5x4 grid of STEM portraits.
// Source images cached under scripts/.cache/ (gitignored). To tune cropping,
// adjust per-photo extractRegion overrides below and re-run.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const cacheDir = join(__dirname, '.cache');
const outPath = join(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;
const COLS = 5;
const ROWS = 4;
export const TW = Math.floor(W / COLS);
export const TH = Math.floor(H / ROWS);

const UA = 'test-data-factory-demo-og/1.0 (https://github.com/mosaic-sunrise/test-data-api)';

// portraits: { url, extractRegion?, extend? }
// extractRegion is a pre-crop hint applied before smartcrop; use for paintings
// or full-body shots where smartcrop picks the wrong region. left/top/width/
// height are in source-image pixels.
// extend pads the (post-extract) source with dark borders so smartcrop's
// largest landscape crop is bigger — used to zoom out portrait-aspect sources
// that would otherwise fill the tile too tightly.
export const portraits = [
  // 1. Katherine Johnson — zoom out (was too tight on head)
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Katherine_Johnson_1983.jpg',
    extractRegion: { left: 0, top: 100, width: 2400, height: 1569 },
  },
  // 2. Ada Lovelace — zoom in on face (painting otherwise dominates)
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Ada_lovelace.jpg',
    extractRegion: { left: 60, top: 60, width: 300, height: 196 },
  },
  // 3. Marie Curie — shift down so chin isn't cut off
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_c._1920s.jpg',
    extractRegion: { left: 0, top: 140, width: 1549, height: 1013 },
  },
  // 4. Dorothy Vaughan — lock to hair-to-chin, pad sides so it fits the tile
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Dorothy_Vaughan_2.jpg',
    extractRegion: { left: 0, top: 0, width: 985, height: 985 },
    extend: { left: 273, right: 272, top: 0, bottom: 0 },
  },
  // 5. Mamie Clark — face is in upper half; smartcrop picks torso without override
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Mamie_Clark_1958.jpg',
    extractRegion: { left: 150, top: 80, width: 520, height: 440 },
  },
  // 6. Annie Easley — extract hair-to-chin then pad sides to zoom out
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Annie_Easley.jpg',
    extractRegion: { left: 0, top: 0, width: 1984, height: 1624 },
    extend: { left: 250, right: 250, top: 0, bottom: 0 },
  },
  // 7. Charlotte Angas Scott — lock to top so head isn't clipped
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/CharlotteAngasScott1910.png',
    extractRegion: { left: 0, top: 0, width: 492, height: 322 },
  },
  // 8. Agnesi — crop from top so face isn't clipped
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Maria_Gaetana_Agnesi.jpg',
    extractRegion: { left: 0, top: 0, width: 344, height: 260 },
  },
  // 9. Hodgkin — portrait-oriented; pad sides to zoom out
  {
    url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Dorothy_Hodgkin_Nobel.jpg',
    extend: { left: 80, right: 80, top: 0, bottom: 0 },
  },
  // 10. Maria Mitchell — oval portrait; bigger extract shifted down for chin
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Maria_Mitchell_portrait.jpg',
    extractRegion: { left: 200, top: 700, width: 3300, height: 2158 },
  },
  // 11. Lise Meitner — zoom in on face (default fits whole bust)
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Lise_Meitner_NatGeo.jpg',
    extractRegion: { left: 540, top: 600, width: 1200, height: 785 },
  },
  // 12. Sophie Brahe — zoom in on head (default fits whole painting)
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Sophie_Brahe_portrait.jpg',
    extractRegion: { left: 100, top: 10, width: 340, height: 222 },
  },
  // 13. Elena Piscopia — tighter zoom on face area
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Elena_Piscopia_portrait.jpg',
    extractRegion: { left: 135, top: 90, width: 280, height: 183 },
  },
  // 14. Wangari Maathai — pad sides to zoom out (frees vertical room for hair)
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Wangari_Maathai_in_2001.jpg',
    extend: { left: 100, right: 100, top: 0, bottom: 0 },
  },
  // 15. Quarraisha — lock to top so forehead is in frame
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Quarraisha_Abdool_Karim.jpg',
    extractRegion: { left: 300, top: 0, width: 2600, height: 1700 },
  },
  // 16. Christina Koch (JSC) — smartcrop default OK
  { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Jsc2023e0016435_alt.jpg' },
  // 17. Jessica Watkins (JSC) — smartcrop default OK
  { url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Jsc2023e0016433_alt.jpg' },
  // 18. Vanessa Wyche — face is upper-right of source; zoom in and centre
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Vanessa_E._Wyche_in_2022.jpg',
    extractRegion: { left: 2000, top: 700, width: 3300, height: 2158 },
  },
  // 19. Jane Goodall — smartcrop default OK
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Jane-goodall_%28cropped%29.jpg' },
  // 20. Grace Hopper — tight zoom on her face, out of group shot with UNIVAC
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Grace_Hopper_and_UNIVAC.jpg',
    extractRegion: { left: 250, top: 105, width: 130, height: 85 },
  },
];

function cacheName(url) {
  return basename(url)
    .replace(/%28cropped%29/g, '')
    .replace(/[^A-Za-z0-9_.-]/g, '_');
}

async function exists(path) {
  try {
    await access(path, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url, attempt = 1) {
  const max = 5;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  if ((res.status === 429 || res.status === 503) && attempt <= max) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt - 1) * 1000;
    console.log(`  [retry ${attempt}/${max}] ${url} → ${res.status}, waiting ${backoff}ms`);
    await new Promise((r) => setTimeout(r, backoff));
    return fetchWithRetry(url, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} for ${url}`);
}

export async function getSourceBuffer(p) {
  const cachePath = join(cacheDir, cacheName(p.url));
  if (await exists(cachePath)) {
    return readFile(cachePath);
  }
  console.log(`[fetch] ${p.url}`);
  const buf = await fetchWithRetry(p.url);
  // sanity: verify it's actually an image (Wikimedia rate-limit returns HTML)
  try {
    await sharp(buf).metadata();
  } catch (e) {
    throw new Error(`Not an image: ${p.url} (${e.message})`);
  }
  await writeFile(cachePath, buf);
  return buf;
}

// Fetches the source and applies the portrait's pre-smartcrop transforms
// (extractRegion, then extend). Shared with debug-tiles.mjs so both scripts
// see the same input to smartcrop.
export async function prepareSource(p) {
  let src = await getSourceBuffer(p);

  if (p.extractRegion) {
    src = await sharp(src).extract(p.extractRegion).toBuffer();
  }

  if (p.extend) {
    // 'copy' replicates the source's edge pixels so the pad blends with
    // whatever background the portrait has (dark drapes, white studio, etc.).
    src = await sharp(src)
      .extend({ ...p.extend, extendWith: 'copy' })
      .toBuffer();
  }

  return src;
}

async function buildTile(p) {
  const src = await prepareSource(p);
  const cropResult = await smartcrop.crop(src, { width: TW, height: TH });
  const c = cropResult.topCrop;
  return sharp(src)
    .extract({ left: c.x, top: c.y, width: c.width, height: c.height })
    .resize(TW, TH, { fit: 'cover' })
    .grayscale()
    .toBuffer();
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(dirname(outPath), { recursive: true });

  const tiles = [];
  for (let i = 0; i < Math.min(portraits.length, COLS * ROWS); i++) {
    try {
      tiles[i] = await buildTile(portraits[i]);
    } catch (err) {
      console.warn(`[skip] ${portraits[i].url}: ${err.message}`);
      tiles[i] = null;
    }
  }

  const composites = tiles
    .map((buf, i) =>
      buf ? { input: buf, top: Math.floor(i / COLS) * TH, left: (i % COLS) * TW } : null,
    )
    .filter(Boolean);

  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[generate-og] wrote ${outPath} with ${composites.length}/${portraits.length} tiles`);
}

// Only run when invoked directly (not when imported by debug-tiles.mjs).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
