export const LIBRARIES = {
  stem: {
    id: 'stem',
    label: 'Women, Trans & BIPOC in STEM',
    npmName: 'stem-achievements-data',
    repoUrl: 'https://github.com/mosaic-sunrise/test-data-stem-women-trans-bipoc',
    requiresAcknowledgment: false,
  },
  'first-nations': {
    id: 'first-nations',
    label: 'First Nations Activists',
    npmName: 'first-nations-activists-data',
    repoUrl: 'https://github.com/mosaic-sunrise/test-data-first-nations-activists',
    requiresAcknowledgment: true,
  },
} as const;

export type LibraryId = keyof typeof LIBRARIES;
export type LibraryConfig = (typeof LIBRARIES)[LibraryId];

export const DEFAULT_LIBRARY: LibraryId = 'stem';
export const FRAMEWORK_REPO_URL = 'https://github.com/mosaic-sunrise/test-data-api';

export function isLibraryId(value: string | null): value is LibraryId {
  return value !== null && value in LIBRARIES;
}
