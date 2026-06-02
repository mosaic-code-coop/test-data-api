import { ref } from "vue";
import type { LibraryId } from "../libraries";

// In-memory only: cleared on every page refresh so the acknowledgment is re-prompted.
const ackMap = ref<Record<string, boolean>>({});

// Global opt-in: if the user decides once per session, we don't ask again for any library.
const firstNationsOptIn = ref<boolean | null>(null);

export function useAcknowledgment() {
  function isAcknowledged(id: LibraryId): boolean {
    return ackMap.value[id] === true;
  }
  function acknowledge(id: LibraryId): void {
    ackMap.value = { ...ackMap.value, [id]: true };
  }
  function hasDecidedFirstNations(): boolean {
    return firstNationsOptIn.value !== null;
  }
  function getFirstNationsOptIn(): boolean {
    return firstNationsOptIn.value ?? false;
  }
  function decideFirstNations(include: boolean): void {
    firstNationsOptIn.value = include;
  }
  return { isAcknowledged, acknowledge, hasDecidedFirstNations, getFirstNationsOptIn, decideFirstNations };
}
