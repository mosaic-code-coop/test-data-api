import { ref, shallowRef, computed, watch } from 'vue';
import { DataFactory, type DataPackage, type Person } from '../types';
import { LIBRARIES, type LibraryConfig, type LibraryId } from '../libraries';
import { useAcknowledgment } from './useAcknowledgment';
import { useUrlState } from './useUrlState';

async function loadDataPackage(pkg: LibraryConfig): Promise<DataPackage> {
  const cdnUrl = `https://esm.sh/${pkg.npmName}@latest`;
  try {
    const mod: { default?: DataPackage } & Record<string, unknown> = await import(
      /* @vite-ignore */ cdnUrl
    );
    const data = mod.default && Array.isArray(mod.default.people) ? mod.default : undefined;
    if (data) return data;
    throw new Error(`Default export missing on ${cdnUrl}`);
  } catch (cdnErr) {
    const base = import.meta.env.BASE_URL || '/';
    const fallbackUrl = `${base}data/${pkg.npmName}.json`;
    const res = await fetch(fallbackUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to load ${pkg.label} from both esm.sh (${(cdnErr as Error).message}) and ${fallbackUrl} (${res.status})`,
      );
    }
    return (await res.json()) as DataPackage;
  }
}

export function useFactory() {
  const { library, personId } = useUrlState();
  const { isAcknowledged, acknowledge } = useAcknowledgment();

  const people = ref<Person[]>([]);
  const factory = shallowRef<DataFactory | null>(null);
  const isLoading = ref(false);
  const loadError = ref<string | null>(null);
  const pendingLibrary = ref<LibraryId | null>(null);

  const requiresPrompt = computed(() => {
    const lib = LIBRARIES[library.value];
    return lib.requiresAcknowledgment && !isAcknowledged(library.value);
  });

  const current = computed<Person | null>(
    () => people.value.find((p) => p.id === personId.value) ?? people.value[0] ?? null,
  );

  let loadToken = 0;

  async function loadLibrary(id: LibraryId) {
    const myToken = ++loadToken;
    const lib = LIBRARIES[id];
    isLoading.value = true;
    loadError.value = null;
    try {
      const dataPackage = await loadDataPackage(lib);
      if (myToken !== loadToken) return; // a newer load superseded this one
      const f = new DataFactory(dataPackage, {
        acknowledgeDeceasedFirstNations: lib.requiresAcknowledgment
          ? isAcknowledged(id)
          : undefined,
      });
      factory.value = f;
      people.value = f.getPeople();
      if (!personId.value || !people.value.some((p) => p.id === personId.value)) {
        personId.value = people.value[Math.floor(Math.random() * people.value.length)]?.id ?? null;
      }
    } catch (err) {
      if (myToken !== loadToken) return;
      loadError.value = (err as Error).message;
      people.value = [];
      factory.value = null;
    } finally {
      if (myToken === loadToken) isLoading.value = false;
    }
  }

  watch(
    library,
    (id) => {
      if (LIBRARIES[id].requiresAcknowledgment && !isAcknowledged(id)) {
        pendingLibrary.value = id;
        people.value = [];
        factory.value = null;
        return;
      }
      pendingLibrary.value = null;
      void loadLibrary(id);
    },
    { immediate: true },
  );

  function confirmAcknowledgment() {
    const id = pendingLibrary.value ?? library.value;
    acknowledge(id);
    pendingLibrary.value = null;
    void loadLibrary(id);
  }

  function declineAcknowledgment() {
    pendingLibrary.value = null;
    library.value = 'stem';
  }

  function setPerson(id: string) {
    personId.value = id;
  }

  function next() {
    if (!people.value.length) return;
    const i = people.value.findIndex((p) => p.id === personId.value);
    const ni = (i + 1 + people.value.length) % people.value.length;
    personId.value = people.value[ni].id;
  }

  function prev() {
    if (!people.value.length) return;
    const i = people.value.findIndex((p) => p.id === personId.value);
    const ni = (i - 1 + people.value.length) % people.value.length;
    personId.value = people.value[ni].id;
  }

  function random() {
    if (!people.value.length) return;
    personId.value = people.value[Math.floor(Math.random() * people.value.length)].id;
  }

  return {
    library,
    personId,
    people,
    factory,
    current,
    isLoading,
    loadError,
    pendingLibrary,
    requiresPrompt,
    confirmAcknowledgment,
    declineAcknowledgment,
    setPerson,
    next,
    prev,
    random,
  };
}
