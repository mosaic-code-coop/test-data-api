#!/usr/bin/env node
// Writes each generate-og tile to scripts/.cache/tile-NN-<name>.jpg for review.
// Run after generate-og.mjs to inspect smartcrop's choices.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, '.cache');

// import portraits + TW/TH from generate-og.mjs
const ogMod = await import('./generate-og.mjs');
// generate-og runs main on import, so duplicate the constants instead:

const TW = 240;
const TH = 157;

const portraitsPath = join(__dirname, 'generate-og.mjs');
const src = await readFile(portraitsPath, 'utf8');
const matches = [
  ...src.matchAll(/\{\s*url:\s*'([^']+)'(?:,\s*extractRegion:\s*(\{[^}]+\}))?\s*\}/g),
];
const portraits = matches.map((m) => ({
  url: m[1],
  extractRegion: m[2] ? eval('(' + m[2] + ')') : undefined,
}));

function cacheName(url) {
  return basename(url)
    .replace(/%28cropped%29/g, '')
    .replace(/[^A-Za-z0-9_.-]/g, '_');
}

async function exists(p) {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

for (let i = 0; i < portraits.length; i++) {
  const p = portraits[i];
  const cachePath = join(cacheDir, cacheName(p.url));
  if (!(await exists(cachePath))) {
    console.warn(`[skip] missing ${cachePath}`);
    continue;
  }
  let buf = await readFile(cachePath);
  if (p.extractRegion) {
    buf = await sharp(buf).extract(p.extractRegion).toBuffer();
  }
  const cropResult = await smartcrop.crop(buf, { width: TW, height: TH });
  const c = cropResult.topCrop;
  const outBuf = await sharp(buf)
    .extract({ left: c.x, top: c.y, width: c.width, height: c.height })
    .resize(TW * 2, TH * 2, { fit: 'cover' })
    .toBuffer();
  const outPath = join(
    cacheDir,
    `tile-${String(i).padStart(2, '0')}-${basename(p.url).split('.')[0]}.jpg`,
  );
  await writeFile(outPath, outBuf);
  console.log(
    `tile ${i.toString().padStart(2)}: ${basename(p.url)} → crop x=${c.x} y=${c.y} w=${c.width} h=${c.height}`,
  );
}
