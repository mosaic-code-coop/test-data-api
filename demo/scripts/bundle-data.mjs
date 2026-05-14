#!/usr/bin/env node
// Bundles both test-data libraries to JSON in public/data/<pkg>.json,
// used as a runtime fallback when esm.sh is unavailable.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import stemAchievementsData from '@mosaic-code/stem-achievements-data';
import firstNationsActivistsData from '@mosaic-code/first-nations-activists-data';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'data');

const bundles = [
  { name: '@mosaic-code/stem-achievements-data', data: stemAchievementsData },
  { name: '@mosaic-code/first-nations-activists-data', data: firstNationsActivistsData },
];

await mkdir(outDir, { recursive: true });

for (const { name, data } of bundles) {
  const target = join(outDir, `${name}.json`);
  await writeFile(target, JSON.stringify(data));
  const bytes = JSON.stringify(data).length;
  console.log(
    `[bundle-data] ${name}: ${data.people.length} people, ${data.groups.length} groups, ${data.events.length} events (${(bytes / 1024).toFixed(1)} KB)`,
  );
}
