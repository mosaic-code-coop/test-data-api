# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-20

Initial public release.

### Renamed

- Package name: `test-data-factory` → `@mosaic-code/test-data-factory`. The
  unscoped name is owned by another publisher on npm; scoping under the
  `@mosaic-code` org is the path forward. Scoped publishes default to
  private — use `npm publish --access public`.

### Added

- `DataFactory` class for deterministic loading and querying of test data packages.
- `validateDataPackage()` shared validator (vitest-based) covering structure, ID
  uniqueness, referential integrity, mock-data safety patterns (`.test` emails,
  `555` phones, `Test` street names), and First Nations acknowledgment gating.
- `validateImageUrls()` shared validator (HTTP HEAD-based, opt-in via
  separate test config).
- `fetch-test-references` bin and `scripts/fetch-references.ts` for archiving
  reference URLs cited by data packages.
- `diversity-report` bin (`scripts/diversity-report.js`) — CLI wrapper around
  the existing `generateDiversityReport` analyzer, accepting `--data`,
  `--output`, `--dataset-name`, `--acknowledge-deceased-first-nations`, and
  `--include-unicode-analysis`. Replaces per-package wrapper scripts.
- `BIO_WRITING_SPEC.md` — shared bio writing guidance referenced by every
  data package's package-specific addendum.
- Diversity analyzer rewritten to detect a person's country from
  `address.country` or a nationality tag, via a single
  `COUNTRY_TO_REGION` map plus a tag → country alias map. Replaces ~140
  lines of name- and bio-substring heuristics that miscounted underrepresented
  regions. Country coverage extended to all countries currently appearing in
  bundled data packages.
- ESLint (flat config, `typescript-eslint` recommended) + Prettier configuration.
- CI workflow runs lint, format check, typecheck, build, and tests.

<!-- Insert future releases below -->

## [0.2.0] - 2026-05-15

### Changed (breaking)

- `validateDataPackage` and `validateImageUrls` are no longer exported from
  the main entry. Both modules statically `import { describe, it, expect }
  from 'vitest'`, which crashed any non-vitest consumer of the package
  (e.g. a `prisma db seed` script) with "Vitest failed to access its
  internal state". They now live on the `/testing` subpath:

  ```ts
  // before
  import { validateDataPackage } from "@mosaic-code/test-data-factory";
  // after
  import { validateDataPackage } from "@mosaic-code/test-data-factory/testing";
  ```

  Migration is a one-line import change per call site.

### Added

- `forSuite(name)` — returns a new `DataFactory` seeded deterministically from
  `name` (e.g. `import.meta.url`) so concurrent test suites pick
  different-but-stable people without colliding on the same subset.
- `stringToSeed(string)` — exported cyrb53 hash; combine with `setSeed` for
  custom seeding strategies.
- `nullabilityOverrides` option in `LoadDataOptions` to override per-field
  nullability percentages.
- Accept multiple `DataPackage` arrays in `loadData`; unacknowledged First
  Nations packages are excluded per-package.

### Fixed

- `validateImageUrls` rewritten with proper image detection.
- Allow `null` pronouns; relax tag casing; document `[Test]` convention.
