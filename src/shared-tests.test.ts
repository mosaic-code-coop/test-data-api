import { describe, it, expect } from "vitest";
import { validateDataPackage } from "./shared-tests.js";
import { DataFactory } from "./DataFactory.js";
import type { DataPackage } from "./types.js";

const validFixture: DataPackage = {
  people: [
    {
      id: "p1",
      fullName: "Ada Lovelace",
      pronouns: "she/her",
      bio: "Mathematician and the first computer programmer, who collaborated with Charles Babbage on his Analytical Engine.",
      email: "ada.lovelace@example.test",
      phone: "555-0100",
      picture: "https://example.test/ada.jpg",
      tags: ["mathematician", "historical"],
      groupMemberships: ["g1"],
      reference: "https://example.test/ada-bio",
      address: {
        street: "1 Test Lane",
        city: "London",
        state: "LDN",
        country: "UK",
        zipCode: "00000",
      },
      dateOfBirth: new Date("1815-12-10"),
    },
    {
      id: "p2",
      fullName: "Grace Hopper",
      pronouns: "she/her",
      bio: "Computer scientist and US Navy rear admiral, pioneer of programming languages and developer of COBOL.",
      email: "grace.hopper@example.test",
      phone: "555-0101",
      picture: "https://example.test/grace.jpg",
      tags: ["computer-science", "historical"],
      groupMemberships: [],
      dateOfBirth: new Date("1906-12-09"),
    },
  ],
  groups: [
    {
      id: "g1",
      name: "Test Group",
      about: "A group used purely for fixture validation.",
      email: "group@example.test",
      website: "https://example.test",
      picture: null,
    },
  ],
  events: [
    {
      id: "e1",
      name: "Test Event",
      date: new Date("2000-01-01"),
      attendeeIds: ["p1", "p2"],
    },
  ],
};

validateDataPackage(validFixture, {
  datasetName: "fixture",
  minBirthYear: 1800,
  maxBirthYear: 2010,
  requirePronouns: true,
  requireDateOfBirth: true,
  minBioLength: 50,
});

describe("DataFactory First Nations acknowledgment gate", () => {
  const fnFixture: DataPackage = {
    people: [
      {
        id: "fn1",
        fullName: "Test Person",
        pronouns: "they/them",
        bio: "A fixture person flagged as First Nations to exercise the acknowledgment requirement gate.",
        email: "test@example.test",
        phone: null,
        picture: null,
        tags: ["historical"],
        isFirstNations: true,
      },
    ],
    groups: [],
    events: [],
    metadata: { containsFirstNationsPeople: true },
  };

  it("throws when acknowledgment is missing", () => {
    const factory = new DataFactory(fnFixture, { acknowledgeDeceasedFirstNations: false });
    expect(() => factory.getPeople()).toThrow(/requires acknowledgment/);
  });

  it("returns people when acknowledgment is provided", () => {
    const factory = new DataFactory(fnFixture, { acknowledgeDeceasedFirstNations: true });
    expect(factory.getPeople()).toHaveLength(1);
  });
});
