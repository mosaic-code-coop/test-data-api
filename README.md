# Test Data Factory

A deterministic test data API that accepts data packages and provides fast retrieval methods. Perfect for creating consistent, repeatable test scenarios.

**Live demo**: https://mosaic-code-coop.github.io/test-data-api/ — try the framework with real biographies from two data libraries. Source lives in [`demo/`](./demo).

## Installation

```bash
npm install @mosaic-code/test-data-factory
```

## Basic Usage

```typescript
import DataFactory from "@mosaic-code/test-data-factory";
import stemAchievementsData from "@mosaic-code/stem-achievements-data";
import firstNationsActivistsData from "@mosaic-code/first-nations-activists-data";

/**
 * Some Indigenous and First Nations cultures have important customs around the naming and display of
 * images or voices of people who have passed away. As a sign of respect for these cultural practices,
 * the test-data-api requires libraries that depict or describe first nations persons to indiciate
 * that they do, and to require callers of the library to explicitly opt-in to showing those images.
 *
 * In CI/tests, an env var works; in a UI, surface
 * a confirmation prompt and pass its result.
 */
const acknowledgeFirstNations = process.env.ACKNOWLEDGE_FIRST_NATIONS === "true";

// Pass multiple libraries as an array. Any package that requires First Nations
// acknowledgment is silently dropped when `acknowledgeDeceasedFirstNations`
// is false — other packages still load.
const combined = new DataFactory([stemAchievementsData, firstNationsActivistsData], {
  acknowledgeDeceasedFirstNations: acknowledgeFirstNations,
});

// Returns people drawn from either library — First Nations persons are
// excluded when acknowledgeFirstNations is false.
const users = combined.getPeople(3);
const ada = combined.getPerson("ada-lovelace");
```

## Deterministic Testing

```typescript
// Set seed for consistent results
factory.setSeed(12345);
const users1 = factory.getPeople(5);

factory.setSeed(12345);
const users2 = factory.getPeople(5);

// users1 and users2 are identical
```

### Concurrent test suites

When 100 test files each call `getPeople(5)` from the same factory, they will
collide on the same 5 people. Scope by suite name so each file picks
different-but-stable people:

```typescript
// `forSuite` returns a new factory seeded from the name; the original is untouched.
const factory = baseFactory.forSuite(import.meta.url);
const users = factory.getPeople(5);
```

Different suite names produce different selections; the same suite name always
produces the same selection. Collisions are not impossible — this is
probabilistic, not partitioned.

For advanced use, `stringToSeed(string)` is exported separately and can be
combined with `setSeed` if you want to keep the suite name management outside
the factory call.

## API Reference

### Seed Management

- `setSeed(number)` - Sets random seed for deterministic results
- `getSeed()` - Returns current seed value
- `forSuite(name)` - Returns a new factory seeded from `name` (e.g. a test file path)
- `stringToSeed(string)` - Derive a numeric seed from a string; pair with `setSeed`

### People

- `getPeople(count?)` - Get people (all if no count, random selection if count provided)
- `getPerson(id)` - Get person by ID
- `getPersonByEmail(email)` - Get person by email
- `getPeopleByTag(tag)` - Filter people by tag
- `getPeopleInGroup(groupId)` - Get people in a group

### Groups

- `getGroups(count?)` - Get groups (all if no count, random selection if count provided)
- `getGroup(id)` - Get group by ID

### Events

- `getEvents(count?)` - Get events (all if no count, random selection if count provided)
- `getEvent(id)` - Get event by ID

## Image Validation

For datasets with image URLs, you can run separate image validation tests to ensure:

- Images return 200 status codes
- Content-Type headers indicate image files
- Response bodies don't contain HTML (prevents redirects to error pages)

```typescript
// Note the `/testing` subpath — these helpers statically import `vitest`
// and must not be loaded from non-test code (e.g. `prisma db seed`).
import { validateImageUrls } from "@mosaic-code/test-data-factory/testing";

// Run image validation separately (slower, uses bandwidth)
validateImageUrls(yourDataPackage, {
  datasetName: "Your Dataset",
  httpTimeout: 15000, // 15 second timeout
  skipImageValidation: false,
});

// Skip image validation (useful for CI/CD)
validateImageUrls(yourDataPackage, { skipImageValidation: true });
```

**Note:** Image validation is separate from the main validation suite because it:

- Makes HTTP requests (slower)
- Consumes bandwidth
- May timeout on slow connections
- Should be run selectively in development/testing

The same `/testing` subpath also exports `validateDataPackage` — the structural
validator that covers ID uniqueness, referential integrity, and mock-data
safety patterns.

## Building a Data Package from Per-Record Files

For larger data packages, splitting each record into its own file (and assembling at build time) makes contributions and reviews much easier. This package ships an `assemble-data-package` CLI that does exactly that.

### Conventions

```
your-data-package/
  src/
    person/<id>.ts     # one file per person, default-exports a Person
    group/<id>.ts      # one file per group
    event/<id>.ts      # one file per event
    _generated/        # ← gitignore; produced by the assembler
      data-package.ts
    index.ts           # re-exports from _generated/
```

- Filename basename must match the record's `id` field
- Each per-record file `export default` a typed record:
  ```ts
  import type { Person } from "@mosaic-code/test-data-factory";
  export default {
    id: "ada-lovelace",
    fullName: "Ada Lovelace",
    // ...
  } satisfies Person;
  ```

### npm scripts

```json
{
  "scripts": {
    "assemble": "assemble-data-package --export-name=myData",
    "prebuild": "npm run assemble",
    "build": "tsc",
    "pretest": "npm run assemble",
    "test": "vitest run"
  }
}
```

The assembler validates IDs are unique, `groupMemberships` resolve, and `attendeeIds` resolve before writing the generated file.

### CLI flags

- `--export-name=<name>` — the named export in the generated file (defaults to `dataPackage`)
- `--contains-first-nations` — sets `metadata.containsFirstNationsPeople = true` (required if any record represents First Nations persons; gates loading behind acknowledgment)

### Migrating an existing monolithic data package

If you have a single `src/index.ts` with all records inlined, run:

```
npx migrate-monolith                         # for data packages with clean slug IDs
npx migrate-monolith --rename-person-ids     # regenerate person IDs as slugs from fullName
```

This writes per-record files under `src/person/`, `src/group/`, `src/event/` and moves the old structure to `.trash/`. Run it once per package.

## Data Package Format

Your data package should export an object with:

```typescript
interface DataPackage {
  people: Person[];
  groups: Group[];
  events: Event[];
  metadata?: DataPackageMetadata;
}

interface DataPackageMetadata {
  containsFirstNationsPeople: boolean;
}

interface Person {
  id: string;
  fullName: string;
  bio: string | null;
  email: string;
  phone: string | null;
  picture: string | null;
  tags: string[];
  groupMemberships: string[];
}

interface Group {
  id: string;
  name: string;
  about: string;
  email: string | null;
  website: string | null;
  picture: string | null;
}

interface Event {
  id: string;
  name: string;
  date: Date;
  attendeeIds: string[];
}
```

## Nullable Fields

The library automatically makes certain fields nullable based on realistic percentages:

**Person:**

- `bio`: 20% null
- `phone`: 65% null
- `picture`: 25% null

**Group:**

- `email`: 30% null
- `website`: 40% null
- `picture`: 50% null

This helps test scenarios where users haven't filled out all profile information.

## Metadata

The `metadata` field is optional by default, but is **required** when your dataset contains First Nations, Indigenous, or Aboriginal people. This ensures proper cultural protocols are followed.

When `containsFirstNationsPeople` is true:

- The `DataFactory` only loads the package when `acknowledgeDeceasedFirstNations: true` is passed
- Without acknowledgment, the package is dropped: single-package callers get an empty result; multi-package callers still get the non-First-Nations packages
- Validation will check that people marked with `isFirstNations: true` have appropriate cultural markers in their tags or bio

```typescript
// Single package
const factory = new DataFactory(firstNationsData, {
  acknowledgeDeceasedFirstNations: true,
});

// Multiple packages — unacknowledged First Nations packages are skipped,
// the rest still load
const factory = new DataFactory([stemData, firstNationsData], {
  acknowledgeDeceasedFirstNations: true,
});
```

## Performance

- Library initialization: < 100ms
- Individual record retrieval: < 1ms
- Random selection operations: < 10ms
- Memory efficient for datasets up to 1000 records

## Example Test

```typescript
import { describe, it, expect } from "vitest";
import DataFactory from "@mosaic-code/test-data-factory";
import myDataPackage from "./my-data-package";

describe("User Service", () => {
  const factory = new DataFactory(myDataPackage);

  it("should handle user creation", () => {
    factory.setSeed(42); // Deterministic test data
    const testUser = factory.getPeople(1)[0];

    const result = userService.createUser(testUser);

    expect(result.email).toBe(testUser.email);
  });
});
```
