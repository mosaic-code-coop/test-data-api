#!/usr/bin/env node
// Writes each generate-og tile to scripts/.cache/tile-NN-<name>.jpg for review.
// Run after generate-og.mjs to inspect smartcrop's choices.

import { writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';

import { portraits, prepareSource, cacheDir, TW, TH } from './generate-og.mjs';

for (let i = 0; i < portraits.length; i++) {
  const p = portraits[i];
  let buf;
  try {
    buf = await prepareSource(p);
  } catch (err) {
    console.warn(`[skip] ${p.url}: ${err.message}`);
    continue;
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
