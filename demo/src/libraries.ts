export const LIBRARIES = {
  stem: {
    id: "stem",
    label: "Women, Trans & BIPOC in STEM",
    npmName: "@mosaic-code/stem-achievements-data",
    repoUrl: "https://github.com/mosaic-code-coop/test-data-stem-women-trans-bipoc",
    defaultBranch: "main",
    requiresAcknowledgment: false,
  },
  "first-nations": {
    id: "first-nations",
    label: "First Nations Activists",
    npmName: "@mosaic-code/first-nations-activists-data",
    repoUrl: "https://github.com/mosaic-code-coop/test-data-first-nations-activists",
    defaultBranch: "main",
    requiresAcknowledgment: true,
  },
  "lgbtq-figures": {
    id: "lgbtq-figures",
    label: "LGBTQ+ Figures",
    npmName: "@mosaic-code/lgbtq-figures-data",
    repoUrl: "https://github.com/mosaic-code-coop/test-data-lgbtq-figures",
    defaultBranch: "main",
    requiresAcknowledgment: false,
    hasOptionalFirstNations: true,
  },
} as const;

export type LibraryId = keyof typeof LIBRARIES;
export type LibraryConfig = (typeof LIBRARIES)[LibraryId];

export const DEFAULT_LIBRARY: LibraryId = "stem";
export const FRAMEWORK_REPO_URL = "https://github.com/mosaic-code-coop/test-data-api";

export function isLibraryId(value: string | null): value is LibraryId {
  return value !== null && value in LIBRARIES;
}

export function libHasOptionalFirstNations(lib: LibraryConfig): boolean {
  return "hasOptionalFirstNations" in lib && lib.hasOptionalFirstNations === true;
}

export function starsBadgeUrl(repoUrl: string): string {
  const path = repoUrl.replace(/^https:\/\/github\.com\//, "");
  return `https://img.shields.io/github/stars/${path}?style=social`;
}

export function stargazersUrl(repoUrl: string): string {
  return `${repoUrl}/stargazers`;
}

export function editRecordUrl(lib: LibraryConfig, kind: "person" | "group" | "event", id: string): string {
  return `${lib.repoUrl}/edit/${lib.defaultBranch}/src/${kind}/${id}.ts`;
}

const PERSON_TEMPLATE = `\
import type { Person } from "@mosaic-code/test-data-factory";

const person: Person = {
  id: "person-name",
  fullName: "Person's Full Name",
  bio: "A short bio describing their contributions and significance.",
  email: "name@example.test",
  phone: "+1-555-0100",
  picture: "https://upload.wikimedia.org/wikipedia/commons/...",
  tags: ["primary-field", "another-tag"],
  reference: "https://en.wikipedia.org/wiki/...",
};

export default person;
`;

export function addPersonUrl(lib: LibraryConfig): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${lib.repoUrl}/new/${lib.defaultBranch}/src/person?filename=new-person-${suffix}.ts&value=${encodeURIComponent(PERSON_TEMPLATE)}`;
}
