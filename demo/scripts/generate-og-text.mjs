#!/usr/bin/env node
// Text-only OG image generator (no portraits).
//
// Usage: node scripts/generate-og-text.mjs "<title>" <out-base-name>
// Example: node scripts/generate-og-text.mjs "First Nations Activists" og-image-first-nations
//
// Writes public/<out-base-name>.png and .jpg at 1200x630.

import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const W = 1200;
const H = 630;
const BACKGROUND = "#141414";
const FOREGROUND = "#f2efe8";
const FONT_FAMILY = "Liberation Serif, DejaVu Serif, serif";
const FONT_SIZE = 110;
const LINE_HEIGHT = 130;

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Split on spaces into one word per line so the title stacks left-aligned.
function buildSvg(title) {
  const lines = title.split(" ");
  const blockHeight = lines.length * LINE_HEIGHT;
  const firstBaseline = (H - blockHeight) / 2 + FONT_SIZE;
  const tspans = lines
    .map((line, i) => `<tspan x="100" y="${firstBaseline + i * LINE_HEIGHT}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BACKGROUND}"/>
  <text font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="${FOREGROUND}">${tspans}</text>
</svg>`;
}

async function main() {
  const [title, outBase] = process.argv.slice(2);
  if (!title || !outBase) {
    console.error('Usage: generate-og-text.mjs "<title>" <out-base-name>');
    process.exit(1);
  }

  await mkdir(publicDir, { recursive: true });
  const canvas = sharp(Buffer.from(buildSvg(title)));
  const outPng = join(publicDir, `${outBase}.png`);
  const outJpg = join(publicDir, `${outBase}.jpg`);
  await canvas.clone().png().toFile(outPng);
  await canvas.clone().flatten({ background: BACKGROUND }).jpeg({ quality: 90 }).toFile(outJpg);
  console.log(`[generate-og-text] wrote ${outPng} + ${outJpg}`);
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
