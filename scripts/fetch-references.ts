#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const DEBUG = args.includes('--debug');
let datasetPath = './src/index.ts';
let outputDir = './references';

// Parse non-flag arguments
for (const arg of args) {
  if (!arg.startsWith('--')) {
    if (arg.endsWith('.ts') || arg.endsWith('.js')) {
      datasetPath = arg;
    } else {
      outputDir = arg;
    }
  }
}

function debugLog(...messages: unknown[]) {
  if (DEBUG) {
    console.log(...messages);
  }
}

/**
 * Get the directory path from a URL
 * e.g., https://example.com/path/to/page -> https://example.com/path/to/
 */
function getBaseUrl(url: string): string {
  const urlObj = new URL(url);
  // Remove the filename from the path
  const pathname = urlObj.pathname;
  const lastSlash = pathname.lastIndexOf('/');
  const basePath = lastSlash > 0 ? pathname.substring(0, lastSlash + 1) : pathname;
  return `${urlObj.protocol}//${urlObj.host}${basePath}`;
}

/**
 * Inject a <base> tag into the HTML <head>
 */
function injectBaseTag(html: string, baseUrl: string): string {
  // Check if <base> tag already exists
  const baseTagRegex = /<base\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const existingBase = html.match(baseTagRegex);

  if (existingBase) {
    // Replace existing <base> tag
    const newBaseTag = `<base href="${baseUrl}">`;
    return html.replace(baseTagRegex, newBaseTag);
  }

  // Find the <head> tag and insert <base> after it
  const headTagMatch = html.match(/<head[^>]*>/i);
  if (headTagMatch) {
    const headEndIndex = headTagMatch.index! + headTagMatch[0].length;
    const baseTag = `\n    <base href="${baseUrl}">`;
    return html.slice(0, headEndIndex) + baseTag + html.slice(headEndIndex);
  }

  // No <head> tag found - just prepend to document
  return `<base href="${baseUrl}">\n` + html;
}

/**
 * Fetch HTML content from URL
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    debugLog(`  Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReferenceFetcher/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    debugLog(`  Fetched ${html.length} characters`);
    return html;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog(`  Failed to fetch: ${message}`);
    return null;
  }
}

/**
 * Save HTML content to file
 */
function saveHtml(content: string, filepath: string): void {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content, 'utf-8');
  debugLog(`  Saved: ${filepath}`);
}

/**
 * Fetch and save HTML from a URL
 */
async function fetchAndSaveReference(url: string, outputFile: string): Promise<boolean> {
  const html = await fetchHtml(url);
  if (!html) {
    console.log(`  Failed to fetch: ${url}`);
    return false;
  }

  // Inject <base> tag to fix relative URLs
  const baseUrl = getBaseUrl(url);
  const htmlWithBase = injectBaseTag(html, baseUrl);

  // Save to file
  saveHtml(htmlWithBase, outputFile);
  console.log(`  Saved to: ${outputFile}`);
  return true;
}

/**
 * Process a single person
 */
async function processPerson(
  person: Person,
): Promise<{ reference: boolean; quoteReference: boolean }> {
  const personId = person.id;
  const personName = person.fullName || person.englishName || person.preferredName || personId;
  const referenceUrl = person.reference;
  const quoteReferenceUrl = person.quoteReference;

  console.log(`Processing person: ${personName} (${personId})`);

  const result = { reference: false, quoteReference: false };

  // Fetch main reference
  if (referenceUrl) {
    const outputFile = path.join(outputDir, `${personId}.html`);
    result.reference = await fetchAndSaveReference(referenceUrl, outputFile);
  } else {
    console.log(`  No reference URL, skipping`);
  }

  // Fetch quote reference
  if (quoteReferenceUrl) {
    const outputFile = path.join(outputDir, `${personId}-quote.html`);
    result.quoteReference = await fetchAndSaveReference(quoteReferenceUrl, outputFile);
  }

  return result;
}

/**
 * Process a single group
 */
async function processGroup(group: Group): Promise<boolean> {
  const groupId = group.id;
  const groupName = group.name || groupId;
  const referenceUrl = group.reference;

  console.log(`Processing group: ${groupName} (${groupId})`);

  if (referenceUrl) {
    const outputFile = path.join(outputDir, `group-${groupId}.html`);
    return await fetchAndSaveReference(referenceUrl, outputFile);
  } else {
    console.log(`  No reference URL, skipping`);
    return false;
  }
}

/**
 * Process a single event
 */
async function processEvent(event: Event): Promise<boolean> {
  const eventId = event.id;
  const eventName = event.name || eventId;
  const referenceUrl = event.reference;

  console.log(`Processing event: ${eventName} (${eventId})`);

  if (referenceUrl) {
    const outputFile = path.join(outputDir, `event-${eventId}.html`);
    return await fetchAndSaveReference(referenceUrl, outputFile);
  } else {
    console.log(`  No reference URL, skipping`);
    return false;
  }
}

/**
 * Load dataset from file path
 */
async function loadDataset(datasetPath: string): Promise<DataPackage> {
  // Resolve to absolute path
  const absolutePath = path.resolve(datasetPath);

  debugLog(`Loading dataset from: ${absolutePath}`);

  // Import the dataset - handle both TS and JS files
  const importPath = absolutePath.endsWith('.ts') ? absolutePath : absolutePath;

  // Dynamic import
  const dataPackage = await import(importPath);

  // Handle different export formats
  const actualData = dataPackage.default || dataPackage;

  return actualData as DataPackage;
}

/**
 * Main execution function
 */
async function run(): Promise<void> {
  debugLog('Starting reference fetcher...');
  debugLog(`Dataset path: ${datasetPath}`);
  debugLog(`Output directory: ${outputDir}`);

  // Load dataset
  let dataPackage: DataPackage;
  try {
    dataPackage = await loadDataset(datasetPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load dataset: ${message}`);
    process.exit(1);
  }

  const people = dataPackage.people || [];
  const groups = dataPackage.groups || [];
  const events = dataPackage.events || [];
  debugLog(`Found ${people.length} people, ${groups.length} groups, ${events.length} events`);

  // Process each person
  let personReferenceCount = 0;
  let quoteReferenceCount = 0;
  let personSkipCount = 0;

  if (people.length > 0) {
    console.log(`\n=== Processing ${people.length} people ===\n`);

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      debugLog(`[${i + 1}/${people.length}]`);

      if (person.reference || person.quoteReference) {
        const result = await processPerson(person);
        if (result.reference) personReferenceCount++;
        if (result.quoteReference) quoteReferenceCount++;
      } else {
        console.log(`Skipping person: ${person.fullName || person.id} (no references)`);
        personSkipCount++;
      }

      // Small delay between requests
      if (i < people.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Process each group
  let groupReferenceCount = 0;
  let groupSkipCount = 0;

  if (groups.length > 0) {
    console.log(`\n=== Processing ${groups.length} groups ===\n`);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      debugLog(`[${i + 1}/${groups.length}]`);

      if (group.reference) {
        const success = await processGroup(group);
        if (success) groupReferenceCount++;
      } else {
        console.log(`Skipping group: ${group.name || group.id} (no reference)`);
        groupSkipCount++;
      }

      // Small delay between requests
      if (i < groups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Process each event
  let eventReferenceCount = 0;
  let eventSkipCount = 0;

  if (events.length > 0) {
    console.log(`\n=== Processing ${events.length} events ===\n`);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      debugLog(`[${i + 1}/${events.length}]`);

      if (event.reference) {
        const success = await processEvent(event);
        if (success) eventReferenceCount++;
      } else {
        console.log(`Skipping event: ${event.name || event.id} (no reference)`);
        eventSkipCount++;
      }

      // Small delay between requests
      if (i < events.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Person references downloaded: ${personReferenceCount}`);
  console.log(`  Quote references downloaded: ${quoteReferenceCount}`);
  console.log(`  Persons skipped: ${personSkipCount}`);
  console.log(`  Group references downloaded: ${groupReferenceCount}`);
  console.log(`  Groups skipped: ${groupSkipCount}`);
  console.log(`  Event references downloaded: ${eventReferenceCount}`);
  console.log(`  Events skipped: ${eventSkipCount}`);
  console.log(`  Output directory: ${outputDir}`);
}

// Type definitions
interface Person {
  id: string;
  fullName?: string;
  englishName?: string;
  preferredName?: string;
  reference?: string;
  quoteReference?: string;
}

interface Group {
  id: string;
  name?: string;
  reference?: string;
}

interface Event {
  id: string;
  name?: string;
  reference?: string;
}

interface DataPackage {
  people?: Person[];
  groups?: Group[];
  events?: Event[];
}

// Run the script
run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
