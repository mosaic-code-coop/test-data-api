import { describe, it, expect } from 'vitest';
import { fileTypeFromBuffer } from 'file-type';
import { DataPackage } from './types.js';

interface ImageValidationOptions {
  /** Dataset name for error reporting */
  datasetName?: string;
  /** Timeout for each HTTP request in milliseconds (default: 10000) */
  httpTimeout?: number;
  /** Overall timeout for each vitest it() block in milliseconds (default: 600000 — 10 minutes) */
  testTimeout?: number;
  /** Delay between successive *uncached* requests in milliseconds (default: 150) */
  requestDelay?: number;
  /** Whether to skip image validation (useful for CI/CD) */
  skipImageValidation?: boolean;
}

// Wikimedia (and other well-behaved hosts) require a descriptive User-Agent or
// they return 429. Without this, Node's fetch sends a default that gets
// rate-limited heavily.
const USER_AGENT =
  'mosaic-test-data-image-validator/1.0 (+https://github.com/mosaic-sunrise/test-data-api)';

const BACKOFF_MS = [500, 1500, 4000];

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRetry(url: string, timeoutMs: number): Promise<Response> {
  for (let attempt = 0; attempt < BACKOFF_MS.length + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      if (response.status !== 429 || attempt === BACKOFF_MS.length) return response;
      await sleep(BACKOFF_MS[attempt]);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`fetchWithRetry: unreachable (url=${url})`);
}

export async function validateImageUrls(
  dataPackage: DataPackage,
  options: ImageValidationOptions = {},
) {
  const defaultOptions: Required<ImageValidationOptions> = {
    datasetName: options.datasetName || 'Dataset',
    httpTimeout: options.httpTimeout || 10000,
    testTimeout: options.testTimeout || 600000,
    requestDelay: options.requestDelay ?? 150,
    skipImageValidation: options.skipImageValidation ?? false,
  };

  if (defaultOptions.skipImageValidation) {
    describe(`${defaultOptions.datasetName} - Image URL Validation (Skipped)`, () => {
      it('should skip image validation when disabled', () => {
        expect(true).toBe(true);
      });
    });
    return;
  }

  describe(`${defaultOptions.datasetName} - Image URL Validation`, () => {
    const people = dataPackage.people;
    const groups = dataPackage.groups;

    // Cache validation results per URL so a URL reused across many profiles
    // (e.g. a shared placeholder) is only fetched once. Otherwise the origin
    // rate-limits us with 429 after many duplicate requests.
    const cache = new Map<string, Promise<void>>();

    async function fetchAndValidate(url: string): Promise<void> {
      const response = await fetchWithRetry(url, defaultOptions.httpTimeout);
      if (response.status !== 200) throw new Error(`GET returned status ${response.status}`);

      const contentType = response.headers.get('content-type');
      if (!contentType) throw new Error('missing content-type header');
      if (!/^image\//.test(contentType)) throw new Error(`content-type is ${contentType}`);

      const buffer = new Uint8Array(await response.arrayBuffer());

      if (/^image\/svg\+xml/.test(contentType)) {
        // file-type doesn't sniff SVG (text format, no magic bytes); look for
        // an <svg root element in the head of the body instead.
        const bodyPreview = new TextDecoder('utf-8', { fatal: false }).decode(
          buffer.slice(0, 4096),
        );
        if (!/<svg[\s>]/i.test(bodyPreview)) throw new Error('SVG body missing <svg root element');
      } else {
        const detected = await fileTypeFromBuffer(buffer);
        if (!detected || !/^image\//.test(detected.mime)) {
          throw new Error(
            `body is not a recognised image (detected=${detected?.mime ?? 'unknown'})`,
          );
        }
      }

      // Throttle between *uncached* fetches only; this sleep is inside the
      // cached promise so duplicate URLs skip it.
      if (defaultOptions.requestDelay > 0) await sleep(defaultOptions.requestDelay);
    }

    async function validateImageUrl(url: string, context: string): Promise<void> {
      let pending = cache.get(url);
      if (!pending) {
        pending = fetchAndValidate(url);
        cache.set(url, pending);
      }
      try {
        await pending;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${context}: ${message}`);
      }
    }

    it(
      'should have valid person image URLs',
      async () => {
        const peopleWithImages = people.filter((person) => person.picture);
        for (const person of peopleWithImages) {
          const personId = person.fullName || person.preferredName || person.id;
          await validateImageUrl(person.picture!, `${personId} (${person.picture})`);
        }
      },
      defaultOptions.testTimeout,
    );

    it(
      'should have valid group image URLs',
      async () => {
        const groupsWithImages = groups.filter((group) => group.picture);
        for (const group of groupsWithImages) {
          await validateImageUrl(group.picture!, `Group ${group.id} (${group.picture})`);
        }
      },
      defaultOptions.testTimeout,
    );
  });
}
