#!/usr/bin/env node
// Generates public/og-image.png — 1200x630 grayscale 5x4 grid of STEM portraits.
// Source images cached under scripts/.cache/ (gitignored). To tune cropping,
// adjust per-photo extractRegion overrides below and re-run.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, '.cache');
const outPath = join(__dirname, '..', 'public', 'og-image.png');

const W = 1200;
const H = 630;
const COLS = 5;
const ROWS = 4;
const TW = Math.floor(W / COLS);
const TH = Math.floor(H / ROWS);

const UA = 'test-data-factory-demo-og/1.0 (https://github.com/mosaic-sunrise/test-data-api)';

// portraits: { url, extractRegion?: { left, top, width, height } } — pre-crop hint
// applied before smartcrop. Use for paintings or full-body shots where smartcrop
// picks the wrong region. left/top/width/height are in source-image pixels.
const portraits = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Katherine_Johnson_1983.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Ada_lovelace.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_c._1920s.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Dorothy_Vaughan_2.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Mamie_Clark_1958.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Annie_Easley.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/CharlotteAngasScott1910.png' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Maria_Gaetana_Agnesi.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Dorothy_Hodgkin_Nobel.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Maria_Mitchell_portrait.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Lise_Meitner_NatGeo.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Sophie_Brahe_portrait.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Elena_Piscopia_portrait.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Wangari_Maathai_in_2001.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Quarraisha_Abdool_Karim.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Jsc2023e0016435_alt.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Jsc2023e0016433_alt.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Vanessa_E._Wyche_in_2022.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Jane-goodall_%28cropped%29.jpg' },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Grace_Hopper_and_UNIVAC.jpg',
    extractRegion: { left: 200, top: 80, width: 200, height: 280 },
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

async function getSourceBuffer(p) {
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

async function buildTile(p) {
  let src = await getSourceBuffer(p);

  if (p.extractRegion) {
    src = await sharp(src).extract(p.extractRegion).toBuffer();
  }

  const cropResult = await smartcrop.crop(src, { width: TW, height: TH });
  const c = cropResult.topCrop;
  return sharp(src)
    .extract({ left: c.x, top: c.y, width: c.width, height: c.height })
    .resize(TW, TH, { fit: 'cover' })
    .grayscale()
    .toBuffer();
}

try {
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
} catch (err) {
  console.error(err);
  process.exit(1);
}
