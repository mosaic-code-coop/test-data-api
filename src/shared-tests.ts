import { describe, it, expect } from "vitest";
import { Person, DataPackage, ValidationOptions } from "./types.js";
import { DataFactory } from "./DataFactory.js";

// Helper: Get person identifier for error messages
function getPersonId(person: Person, index: number): string {
  return person.fullName || person.preferredName || `Person ${index}`;
}

// Helper: Validate a required string field
function validateRequiredString(obj: any, field: string, id: string): void {
  expect(obj[field], `${id}: missing ${field}`).toBeDefined();
  expect(obj[field], `${id}: ${field} must be string`).toEqual(expect.any(String));
  expect(obj[field].length, `${id}: ${field} too short`).toBeGreaterThan(0);
}

// Helper: Validate a field matches a regex pattern
function validatePattern(obj: any, field: string, pattern: RegExp, id: string, message: string): void {
  expect(obj[field], `${id}: ${message}`).toMatch(pattern);
}

// Helper: Validate IDs are unique
function validateUniqueIds(items: any[], type: string): void {
  const ids = new Set();
  items.forEach((item, index) => {
    expect(item.id, `${type} ${index}: missing id`).toBeDefined();
    expect(item.id, `${type} ${index}: id must be string`).toEqual(expect.any(String));
    expect(item.id.length, `${type} ${index}: id too short`).toBeGreaterThan(0);
    expect(ids.has(item.id), `${type} ${index}: duplicate id "${item.id}"`).toBe(false);
    ids.add(item.id);
  });
}

// Helper: Validate an array field
function validateArrayField(obj: any, field: string, id: string): void {
  expect(Array.isArray(obj[field]), `${id}: ${field} must be array`).toBe(true);
}

interface TestOptions extends ValidationOptions {
  acknowledgeDeceasedFirstNations?: boolean;
}

export function validateDataPackage(dataPackage: DataPackage, options: TestOptions = {}) {
  const defaultOptions: Required<TestOptions> = {
    datasetName: options.datasetName || "Dataset",
    minBirthYear: options.minBirthYear || 300,
    maxBirthYear: options.maxBirthYear || 2010,
    requireDateOfBirth: options.requireDateOfBirth ?? true,
    minBioLength: options.minBioLength || 50,
    containsFirstNationsPeople: options.containsFirstNationsPeople || false,
    validateReferenceUrls: options.validateReferenceUrls ?? false,
    httpTimeout: options.httpTimeout || 10000,
    customValidations: options.customValidations || [],
    acknowledgeDeceasedFirstNations: options.acknowledgeDeceasedFirstNations || false,
  };

  describe(`${defaultOptions.datasetName} - Data Structure Validation`, () => {
    it("should have required package structure", () => {
      expect(dataPackage).toBeDefined();
      expect(Array.isArray(dataPackage.people)).toBe(true);
      expect(Array.isArray(dataPackage.groups)).toBe(true);
      expect(Array.isArray(dataPackage.events)).toBe(true);
    });

    it("should have metadata when required", () => {
      if (defaultOptions.containsFirstNationsPeople) {
        expect(dataPackage.metadata).toBeDefined();
        expect(dataPackage.metadata?.containsFirstNationsPeople).toBe(true);
      }
    });

    it("should contain people", () => {
      expect(dataPackage.people.length).toBeGreaterThan(0);
    });
  });

  describe(`${defaultOptions.datasetName} - Individual Person Validations`, () => {
    const people = dataPackage.people;

    people.forEach((person, index) => {
      const personId = getPersonId(person, index);

      describe(`Person: ${personId}`, () => {
        it("has valid id", () => {
          expect(person.id).toBeDefined();
          expect(person.id).toEqual(expect.any(String));
          expect(person.id.length).toBeGreaterThan(0);
        });

        it("has valid name", () => {
          validateRequiredString(person, "fullName", personId);
        });

        it("has valid bio", () => {
          expect(person.bio, `${personId}: missing bio field`).not.toBeNull();
          expect(person.bio, `${personId}: missing bio field`).not.toBeUndefined();
          expect(person.bio, `${personId}: bio must be string`).toEqual(expect.any(String));
          if (person.bio) {
            expect(
              person.bio.length,
              `${personId}: bio too short (${person.bio.length} chars, minimum ${defaultOptions.minBioLength})`,
            ).toBeGreaterThanOrEqual(defaultOptions.minBioLength);
          }
        });

        if (defaultOptions.requireDateOfBirth) {
          it("has valid birth date", () => {
            expect(person.dateOfBirth, `${personId}: missing dateOfBirth field`).toBeDefined();
            expect(person.dateOfBirth, `${personId}: dateOfBirth must be a Date object`).toBeInstanceOf(Date);

            const birthYear = person.dateOfBirth!.getFullYear();
            expect(
              birthYear,
              `${personId}: unrealistic birth year ${birthYear} (expected ${defaultOptions.minBirthYear}-${defaultOptions.maxBirthYear})`,
            ).toBeGreaterThanOrEqual(defaultOptions.minBirthYear);
            expect(
              birthYear,
              `${personId}: unrealistic birth year ${birthYear} (expected ${defaultOptions.minBirthYear}-${defaultOptions.maxBirthYear})`,
            ).toBeLessThanOrEqual(defaultOptions.maxBirthYear);
          });
        }

        it("has valid pronouns or null", () => {
          // Pronouns are intentionally optional. Some historical figures have
          // no stated modern pronouns; when set, must be a non-empty string.
          if (person.pronouns != null) {
            expect(person.pronouns, `${personId}: pronouns must be string`).toEqual(expect.any(String));
            expect(person.pronouns.length, `${personId}: pronouns too short`).toBeGreaterThan(0);
          }
        });

        it("has valid email", () => {
          validateRequiredString(person, "email", personId);
          validatePattern(person, "email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/, personId, "invalid email format");
          validatePattern(person, "email", /\.test$/, personId, "should use .test domain for mock data safety");
        });

        it("has valid phone if present", () => {
          if (person.phone) {
            expect(person.phone, `${personId}: phone must be string`).toEqual(expect.any(String));
            validatePattern(
              person,
              "phone",
              /555|test|-55-5/i,
              personId,
              "should use 555, test, or -55-5 for mock data safety",
            );
          }
        });

        it("has fake street address if present", () => {
          if (person.address?.street) {
            expect(person.address.street, `${personId}: should use " Test" for mock data safety`).toMatch(/ Test/);
          }
        });

        it("has valid reference URL if present", () => {
          const personWithRef = person as any;
          if (personWithRef.reference) {
            expect(personWithRef.reference, `${personId}: reference must be valid HTTPS URL`).toMatch(/^https:\/\/.+/);
          }
        });

        it("has valid tags", () => {
          validateArrayField(person, "tags", personId);

          person.tags.forEach((tag, tagIndex) => {
            expect(tag, `${personId}: tag ${tagIndex} must be string`).toEqual(expect.any(String));
            expect(tag, `${personId}: tag "${tag}" must be alphanumeric with hyphens only`).toMatch(/^[A-Za-z0-9-]+$/);
          });
        });

        it("has valid picture URL or null", () => {
          // Per schema, picture is `string | null`. When set, it must be HTTPS.
          if (person.picture !== null) {
            validateRequiredString(person, "picture", personId);
            validatePattern(person, "picture", /^https:\/\/.+/, personId, "picture must be valid HTTPS URL");
          }
        });

        it("has valid group memberships structure", () => {
          // groupMemberships is optional; if present, must be array
          if (person.groupMemberships) {
            validateArrayField(person, "groupMemberships", personId);
          } else {
            // Missing groupMemberships is treated as empty array
            expect(person.groupMemberships).toBeUndefined();
          }
        });
      });
    });
  });

  describe(`${defaultOptions.datasetName} - Individual Group Validations`, () => {
    const groups = dataPackage.groups;

    groups.forEach((group) => {
      const groupId = `Group ${group.id}`;

      describe(`${groupId}`, () => {
        it("has valid id", () => {
          expect(group.id).toBeDefined();
          expect(group.id).toEqual(expect.any(String));
          expect(group.id.length).toBeGreaterThan(0);
        });

        it("has valid name", () => {
          validateRequiredString(group, "name", groupId);
        });

        it("has valid about", () => {
          expect(group.about, `${groupId}: missing about`).toBeDefined();
          expect(group.about, `${groupId}: about must be string`).toEqual(expect.any(String));
          expect(group.about.length, `${groupId}: about too short`).toBeGreaterThan(10);
        });

        it("has valid email if present", () => {
          if (group.email) {
            expect(group.email, `${groupId}: should use .test domain for mock data safety`).toMatch(/\.test$/);
          }
        });
      });
    });
  });

  describe(`${defaultOptions.datasetName} - Individual Event Validations`, () => {
    const events = dataPackage.events;

    events.forEach((event) => {
      const eventId = `Event ${event.id}`;

      describe(`${eventId}`, () => {
        it("has valid id", () => {
          expect(event.id).toBeDefined();
          expect(event.id).toEqual(expect.any(String));
          expect(event.id.length).toBeGreaterThan(0);
        });

        it("has valid name", () => {
          validateRequiredString(event, "name", eventId);
        });

        it("has valid date", () => {
          expect(event.date, `${eventId}: missing date`).toBeDefined();
          expect(event.date, `${eventId}: date must be Date object`).toBeInstanceOf(Date);
        });

        it("has valid attendee IDs structure", () => {
          validateArrayField(event, "attendeeIds", eventId);
        });
      });
    });
  });

  describe(`${defaultOptions.datasetName} - Cross-Entity Validations`, () => {
    describe("ID Uniqueness", () => {
      it("all person IDs are unique", () => {
        validateUniqueIds(dataPackage.people, "Person");
      });

      it("all group IDs are unique", () => {
        validateUniqueIds(dataPackage.groups, "Group");
      });

      it("all event IDs are unique", () => {
        validateUniqueIds(dataPackage.events, "Event");
      });
    });

    describe("Relationship Validations", () => {
      it("group memberships reference valid groups", () => {
        const groupIds = new Set(dataPackage.groups.map((g) => g.id));

        dataPackage.people.forEach((person) => {
          // Handle optional groupMemberships - treat missing as empty array
          const memberships = person.groupMemberships || [];
          memberships.forEach((groupId) => {
            expect(
              groupIds.has(groupId),
              `Person ${person.fullName || person.id}: references non-existent group "${groupId}"`,
            ).toBe(true);
          });
        });
      });

      it("event attendees reference valid people", () => {
        const personIds = new Set(dataPackage.people.map((p) => p.id));

        dataPackage.events.forEach((event) => {
          event.attendeeIds.forEach((attendeeId) => {
            expect(
              personIds.has(attendeeId),
              `Event "${event.name}": references non-existent person "${attendeeId}"`,
            ).toBe(true);
          });
        });
      });
    });
  });

  // Add DataFactory integration tests
  describe(`${defaultOptions.datasetName} - DataFactory Integration`, () => {
    it("should work with DataFactory when properly acknowledged", () => {
      const testFactory = new DataFactory(dataPackage, {
        acknowledgeDeceasedFirstNations: defaultOptions.acknowledgeDeceasedFirstNations,
      });

      const people = testFactory.getPeople();
      const groups = testFactory.getGroups();
      const events = testFactory.getEvents();

      expect(Array.isArray(people)).toBe(true);
      expect(Array.isArray(groups)).toBe(true);
      expect(Array.isArray(events)).toBe(true);
      expect(people.length).toBeGreaterThan(0);
    });

    it("should support filtering by count", () => {
      const testFactory = new DataFactory(dataPackage, {
        acknowledgeDeceasedFirstNations: defaultOptions.acknowledgeDeceasedFirstNations,
      });

      const allPeople = testFactory.getPeople();
      const somePeople = testFactory.getPeople(5);

      expect(somePeople.length).toBeLessThanOrEqual(5);
      expect(somePeople.length).toBeLessThanOrEqual(allPeople.length);
    });

    if (defaultOptions.containsFirstNationsPeople) {
      const firstNationsPeople = dataPackage.people.filter((person) => person.isFirstNations === true);
      const nonFirstNationsPeople = dataPackage.people.filter((person) => person.isFirstNations !== true);
      const packageWideFn = dataPackage.metadata?.containsFirstNationsPeople === true && firstNationsPeople.length === 0;
      const allPeopleAreFn = packageWideFn || nonFirstNationsPeople.length === 0;

      if (allPeopleAreFn) {
        it("should require acknowledgment for First Nations data", () => {
          const factoryWithoutAck = new DataFactory(dataPackage, {
            acknowledgeDeceasedFirstNations: false,
          });
          expect(() => factoryWithoutAck.getPeople()).toThrow(/requires acknowledgment/);
        });
      } else {
        it("should filter out First Nations people without acknowledgment", () => {
          const factoryWithoutAck = new DataFactory(dataPackage, {
            acknowledgeDeceasedFirstNations: false,
          });
          const people = factoryWithoutAck.getPeople();
          expect(people.length).toBe(nonFirstNationsPeople.length);
          expect(people.every((person) => person.isFirstNations !== true)).toBe(true);
        });

        it("should include First Nations people with acknowledgment", () => {
          const factoryWithAck = new DataFactory(dataPackage, {
            acknowledgeDeceasedFirstNations: true,
          });
          const people = factoryWithAck.getPeople();
          expect(people.length).toBe(dataPackage.people.length);
        });
      }
    }
  });

  // Run custom validations as separate tests
  if (defaultOptions.customValidations.length > 0) {
    describe(`${defaultOptions.datasetName} - Custom Validations`, () => {
      defaultOptions.customValidations.forEach((validation, index) => {
        it(`should pass custom validation ${index + 1}`, () => {
          dataPackage.people.forEach((person, personIndex) => {
            const errors = validation(person, personIndex);
            expect(errors, `Person ${person.fullName || person.id}: ${errors.join(", ")}`).toHaveLength(0);
          });
        });
      });
    });
  }
}
