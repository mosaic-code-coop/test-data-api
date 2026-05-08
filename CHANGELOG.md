# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-20

Initial public release.

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
