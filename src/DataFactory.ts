import { Person, Group, Event, DataPackage, NullabilityConfig, LoadDataOptions, DataPackageMetadata } from "./types.js";
import { SeededRandom, stringToSeed } from "./random.js";

export class DataFactory {
  private originalPeople: Person[] = [];
  private originalGroups: Group[] = [];
  private people: Person[] = [];
  private groups: Group[] = [];
  private events: Event[] = [];
  private random: SeededRandom;
  private dataPackageMetadata?: DataPackageMetadata;
  private firstNationsAcknowledged: boolean = false;
  private sourcePackages: DataPackage[] = [];
  private loadOptions?: LoadDataOptions;
  private nullabilityConfig: NullabilityConfig = {
    person: {
      bio: 20,
      phone: 65,
      picture: 25,
      reference: 10,
      address: 15,
      quote: 20,
      dateOfBirth: 10,
      pronouns: 10,
    },
    group: {
      email: 30,
      website: 40,
      picture: 50,
      reference: 85,
    },
  };

  constructor(dataPackage: DataPackage | DataPackage[], options?: LoadDataOptions) {
    this.random = new SeededRandom(0);
    this.loadData(dataPackage, options);
  }

  loadData(dataPackage: DataPackage | DataPackage[], options?: LoadDataOptions): void {
    const packages = Array.isArray(dataPackage) ? dataPackage : [dataPackage];
    this.sourcePackages = packages;
    this.loadOptions = options;
    this.firstNationsAcknowledged = options?.acknowledgeDeceasedFirstNations ?? false;

    if (options?.nullabilityOverrides) {
      const overrides = options.nullabilityOverrides;
      this.nullabilityConfig = {
        person: { ...this.nullabilityConfig.person, ...(overrides.person ?? {}) },
        group: { ...this.nullabilityConfig.group, ...(overrides.group ?? {}) },
      };
    }

    // Drop any package that requires acknowledgment without one. Other packages
    // still load — passing [stem, firstNations] without acknowledgment returns
    // stem's records, not nothing.
    const anyContainsFirstNations = packages.some((pkg) => this.packageContainsFirstNations(pkg));
    this.dataPackageMetadata = anyContainsFirstNations ? { containsFirstNationsPeople: true } : undefined;

    const loadable = this.firstNationsAcknowledged
      ? packages
      : packages.filter((pkg) => !this.packageContainsFirstNations(pkg));

    this.originalPeople = loadable.flatMap((pkg) => pkg.people);
    this.originalGroups = loadable.flatMap((pkg) => pkg.groups);
    this.events = loadable.flatMap((pkg) => pkg.events);
    this.reprocessNullableFields();
  }

  private packageContainsFirstNations(pkg: DataPackage): boolean {
    return (
      pkg.metadata?.containsFirstNationsPeople === true || pkg.people.some((person) => person.isFirstNations === true)
    );
  }

  setSeed(seed: number): void {
    this.random.setSeed(seed);
    this.reprocessNullableFields();
  }

  getSeed(): number {
    return this.random.getSeed();
  }

  forSuite(name: string): DataFactory {
    const sibling = new DataFactory(this.sourcePackages, this.loadOptions);
    sibling.setSeed(stringToSeed(name));
    return sibling;
  }

  getPeople(count?: number): Person[] {
    // Check if we have no people due to First Nations filtering
    if (
      this.people.length === 0 &&
      this.originalPeople.length === 0 &&
      this.dataPackageMetadata?.containsFirstNationsPeople &&
      !this.firstNationsAcknowledged
    ) {
      throw new Error(
        "No people available. This dataset contains First Nations people and requires acknowledgment of cultural protocols regarding deceased persons. Please reload with appropriate acknowledgment flag or load a different or additional dataset.",
      );
    }

    if (count === undefined) {
      return [...this.people];
    }
    const shuffled = this.random.shuffle(this.people);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getPerson(id: string): Person | null {
    return this.people.find((person) => person.id === id) || null;
  }

  getPersonByEmail(email: string): Person | null {
    return this.people.find((person) => person.email === email) || null;
  }

  getGroups(count?: number): Group[] {
    if (count === undefined) {
      return [...this.groups];
    }
    const shuffled = this.random.shuffle(this.groups);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getGroup(id: string): Group | null {
    return this.groups.find((group) => group.id === id) || null;
  }

  getEvents(count?: number): Event[] {
    if (count === undefined) {
      return [...this.events];
    }
    const shuffled = this.random.shuffle(this.events);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  getEvent(id: string): Event | null {
    return this.events.find((event) => event.id === id) || null;
  }

  getPeopleByTag(tag: string): Person[] {
    return this.people.filter((person) => person.tags.includes(tag));
  }

  getPeopleInGroup(groupId: string): Person[] {
    return this.people.filter((person) => (person.groupMemberships || []).includes(groupId));
  }

  private reprocessNullableFields(): void {
    const currentSeed = this.random.getSeed();
    const tempRandom = new SeededRandom(currentSeed);

    this.people = this.processNullableFieldsWithRandom([...this.originalPeople], "person", tempRandom);
    this.groups = this.processNullableFieldsWithRandom([...this.originalGroups], "group", tempRandom);
  }

  private processNullableFieldsWithRandom<T extends Person | Group>(
    items: T[],
    type: "person" | "group",
    random: SeededRandom,
  ): T[] {
    return items.map((item) => {
      const processed = { ...item };

      if (type === "person" && "bio" in processed) {
        const person = processed as Person;
        if (random.shouldBeNull(this.nullabilityConfig.person.bio)) {
          person.bio = null;
        }
        if (random.shouldBeNull(this.nullabilityConfig.person.phone)) {
          person.phone = null;
        }
        if (random.shouldBeNull(this.nullabilityConfig.person.picture)) {
          person.picture = null;
        }
      }

      if (type === "group" && "email" in processed) {
        const group = processed as Group;
        if (random.shouldBeNull(this.nullabilityConfig.group.email)) {
          group.email = null;
        }
        if (random.shouldBeNull(this.nullabilityConfig.group.website)) {
          group.website = null;
        }
        if (random.shouldBeNull(this.nullabilityConfig.group.picture)) {
          group.picture = null;
        }
      }

      return processed;
    });
  }
}
