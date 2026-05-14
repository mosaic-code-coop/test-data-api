#!/usr/bin/env node
// One-shot: split a monolithic src/index.ts into per-record files under
// src/person/, src/group/, src/event/ in the caller's CWD.
//
// Usage:
//   migrate-monolith [--rename-person-ids]
//
// With --rename-person-ids, regenerates person IDs as semantic slugs from
// `fullName` and rewrites all groupMemberships / event.attendeeIds references
// to use the new slugs.

import { mkdir, writeFile, readdir, rename } from "node:fs/promises";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import type { Person, Group, Event, DataPackage } from "../src/types.js";

const cwd = process.cwd();
const renamePersonIds = process.argv.includes("--rename-person-ids");

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tsStringLiteral(s: string): string {
  return JSON.stringify(s);
}

function tsValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
  if (typeof value === "string") return tsStringLiteral(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => `    ${tsValue(v)},`).join("\n")}\n  ]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `  ${k}: ${tsValue(v)},`);
    return `{\n${entries.join("\n")}\n}`;
  }
  throw new Error(`Cannot serialize value of type ${typeof value}`);
}

function renderRecord(item: object, typeName: string): string {
  const body = tsValue(item);
  return `import type { ${typeName} } from '@mosaic-code/test-data-factory';

export default ${body} satisfies ${typeName};
`;
}

async function clearDir(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir);
    const trashDir = join(dir, ".trash");
    await mkdir(trashDir, { recursive: true });
    for (const e of entries) {
      if (e === ".trash") continue;
      await rename(join(dir, e), join(trashDir, `${Date.now()}-${e}`));
    }
  } catch {
    // dir doesn't exist; will be created below
  }
}

async function main(): Promise<void> {
  const monolithUrl = pathToFileURL(join(cwd, "src/index.ts")).href;
  const mod = (await import(monolithUrl)) as { default?: DataPackage };
  if (!mod.default) {
    throw new Error("src/index.ts must have a default export of DataPackage");
  }
  const data = mod.default;

  // Build id rename map for people if requested
  const personIdMap = new Map<string, string>(); // old → new
  if (renamePersonIds) {
    const slugCounts = new Map<string, number>();
    for (const p of data.people) {
      let slug = slugify(p.fullName);
      if (!slug) slug = p.id; // fall back to existing id if name slugs to empty
      const count = slugCounts.get(slug) ?? 0;
      const finalSlug = count === 0 ? slug : `${slug}-${count + 1}`;
      slugCounts.set(slug, count + 1);
      personIdMap.set(p.id, finalSlug);
    }
  }

  function newPersonId(oldId: string): string {
    return personIdMap.get(oldId) ?? oldId;
  }

  // Migrate people
  const peopleDir = join(cwd, "src/person");
  await clearDir(peopleDir);
  await mkdir(peopleDir, { recursive: true });
  let personCount = 0;
  for (const p of data.people) {
    const newId = newPersonId(p.id);
    const rewritten: Person = {
      ...p,
      id: newId,
      // groupMemberships keep their existing IDs (groups not renamed)
    };
    const file = join(peopleDir, `${newId}.ts`);
    await writeFile(file, renderRecord(rewritten, "Person"));
    personCount++;
  }

  // Migrate groups (IDs unchanged)
  const groupsDir = join(cwd, "src/group");
  await clearDir(groupsDir);
  await mkdir(groupsDir, { recursive: true });
  let groupCount = 0;
  for (const g of data.groups) {
    const file = join(groupsDir, `${g.id}.ts`);
    await writeFile(file, renderRecord(g, "Group"));
    groupCount++;
  }

  // Migrate events (rewrite attendeeIds if person IDs changed)
  const eventsDir = join(cwd, "src/event");
  await clearDir(eventsDir);
  await mkdir(eventsDir, { recursive: true });
  let eventCount = 0;
  for (const e of data.events) {
    const rewritten: Event = {
      ...e,
      attendeeIds: e.attendeeIds.map(newPersonId),
    };
    const file = join(eventsDir, `${e.id}.ts`);
    await writeFile(file, renderRecord(rewritten, "Event"));
    eventCount++;
  }

  console.log(`[migrate-monolith] wrote ${personCount} people, ${groupCount} groups, ${eventCount} events`);
  if (renamePersonIds) {
    console.log(`[migrate-monolith] rewrote ${personIdMap.size} person IDs as slugs`);
  }
  console.log("[migrate-monolith] previous src/person, src/group, src/event contents moved to .trash/");
}

main().catch((err) => {
  console.error("[migrate-monolith] " + (err as Error).message);
  process.exit(1);
});
