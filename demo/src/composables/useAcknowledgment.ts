import { ref } from 'vue';
import type { LibraryId } from '../libraries';

// In-memory only: cleared on every page refresh so the acknowledgment is re-prompted.
const ackMap = ref<Record<string, boolean>>({});

export function useAcknowledgment() {
  function isAcknowledged(id: LibraryId): boolean {
    return ackMap.value[id] === true;
  }
  function acknowledge(id: LibraryId): void {
    ackMap.value = { ...ackMap.value, [id]: true };
  }
  return { isAcknowledged, acknowledge };
}
