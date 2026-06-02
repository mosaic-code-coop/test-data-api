#!/usr/bin/env node
// Generic mosaic OG image generator. Reads a JSON config that specifies a
// library package (by npm name) and a list of person IDs with optional per-
// portrait crop hints.
//
// Usage: node scripts/generate-og-mosaic.mjs <config.json> [--color]
//
// Config JSON shape:
//   {
//     "out": "og-image.png",          // relative to public/ (also writes .jpg)
//     "cols": 6,                      // grid columns (default 5)
//     "rows": 4,                      // grid rows (default 4)
//     "library": "@mosaic-code/lgbtq-figures-data",
//     "portraits": [
//       { "id": "alan-turing" },
//       { "id": "harvey-milk", "extractRegion": { "left": 0, "top": 0, "width": 300, "height": 400 } },
//       { "url": "https://example.com/photo.jpg", "extend": { "left": 60, "right": 60, "top": 0, "bottom": 0 } },
//       { "id": "some-person", "manualCrop": { "left": 0, "top": 100, "width": 800, "height": 628 } }
//     ]
//   }
// Each portrait resolves its URL from the library (via "id") or directly via "url".
// extractRegion and extend are applied first (in that order), then either:
//   - manualCrop: deterministic { left, top, width, height } extract bypassing smartcrop
//   - smartcrop: automatic face-aware crop (default)
// --color skips the greyscale filter (useful for previewing).

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename, resolve } from "node:path";
import sharp from "sharp";
import smartcrop from "smartcrop-sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, ".cache");
const demoDir = join(__dirname, "..");

const W = 1200;
const H = 630;

const UA = "test-data-factory-demo-og/1.0 (https://github.com/mosaic-code-coop/test-data-api)";

async function loadConfig(configPath) {
  const raw = await readFile(resolve(configPath), "utf8");
  return JSON.parse(raw);
}

async function loadLibraryPeople(libraryName) {
  if (!libraryName) return new Map();
  const req = createRequire(join(demoDir, "package.json"));
  const libPath = req.resolve(libraryName);
  const mod = await import(pathToFileURL(libPath).href);
  const data = mod.default ?? mod;
  const people = data.people ?? [];
  return new Map(people.map((p) => [p.id, p]));
}

function pictureUrl(person) {
  return typeof person.picture === "string" ? person.picture : null;
}

async function fileExists(path) {
  try {
    await access(path, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url, attempt = 1) {
  const max = 5;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
  if (res.ok) return Buffer.from(await res.arrayBuffer());
  if ((res.status === 429 || res.status === 503) && attempt <= max) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt - 1) * 1000;
    console.log(`  [retry ${attempt}/${max}] ${url} → ${res.status}, waiting ${backoff}ms`);
    await new Promise((r) => setTimeout(r, backoff));
    return fetchWithRetry(url, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} for ${url}`);
}

async function getSourceBuffer(url) {
  const fileName = basename(url).replace(/[^A-Za-z0-9_.-]/g, "_");
  const cachePath = join(cacheDir, fileName);
  if (await fileExists(cachePath)) return readFile(cachePath);
  console.log(`[fetch] ${url}`);
  const buf = await fetchWithRetry(url);
  try {
    await sharp(buf).metadata();
  } catch (e) {
    throw new Error(`Not an image: ${url} (${e.message})`);
  }
  await writeFile(cachePath, buf);
  return buf;
}

async function buildTile(url, hints = {}, tw, th, color) {
  let src = await getSourceBuffer(url);
  if (hints.extractRegion) src = await sharp(src).extract(hints.extractRegion).toBuffer();
  if (hints.extend) src = await sharp(src).extend({ ...hints.extend, extendWith: "copy" }).toBuffer();

  let pipeline;
  if (hints.manualCrop) {
    pipeline = sharp(src).extract(hints.manualCrop).resize(tw, th, { fit: "cover" });
  } else {
    const { topCrop: c } = await smartcrop.crop(src, { width: tw, height: th });
    pipeline = sharp(src)
      .extract({ left: c.x, top: c.y, width: c.width, height: c.height })
      .resize(tw, th, { fit: "cover" });
  }

  if (!color) pipeline = pipeline.grayscale();
  return pipeline.toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  const configArg = args.find((a) => !a.startsWith("--"));
  const color = args.includes("--color");
  const outOverride = (() => {
    const i = args.indexOf("--out");
    return i !== -1 ? args[i + 1] : null;
  })();

  if (!configArg) {
    console.error("Usage: generate-og-mosaic.mjs <config.json> [--color]");
    process.exit(1);
  }

  const config = await loadConfig(configArg);
  const people = await loadLibraryPeople(config.library);

  const COLS = config.cols ?? 5;
  const ROWS = config.rows ?? 4;
  const TW = Math.floor(W / COLS);
  const TH = Math.floor(H / ROWS);

  const outBase = outOverride ?? config.out ?? "og-image.png";
  const outPng = join(demoDir, "public", outBase);
  const outJpg = join(demoDir, "public", outBase.replace(/\.png$/i, ".jpg"));

  await mkdir(cacheDir, { recursive: true });
  await mkdir(dirname(outPng), { recursive: true });

  const entries = config.portraits.slice(0, COLS * ROWS);
  const tiles = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    let url = entry.url ?? null;

    if (!url && entry.id) {
      const person = people.get(entry.id);
      if (!person) {
        console.warn(`[skip] unknown id: ${entry.id}`);
        tiles[i] = null;
        continue;
      }
      url = pictureUrl(person);
      if (!url) {
        console.warn(`[skip] no picture for: ${entry.id}`);
        tiles[i] = null;
        continue;
      }
    }

    try {
      tiles[i] = await buildTile(url, entry, TW, TH, color);
    } catch (err) {
      console.warn(`[skip] ${url}: ${err.message}`);
      tiles[i] = null;
    }
  }

  const composites = tiles
    .map((buf, i) =>
      buf ? { input: buf, top: Math.floor(i / COLS) * TH, left: (i % COLS) * TW } : null
    )
    .filter(Boolean);

  const canvas = sharp({
    create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  }).composite(composites);

  await canvas.clone().png().toFile(outPng);
  await canvas.clone().jpeg({ quality: 90 }).toFile(outJpg);

  const label = color ? " (color)" : "";
  console.log(
    `[generate-og-mosaic] wrote${label} ${outPng} + ${outJpg} (${composites.length}/${entries.length} tiles)`
  );
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
