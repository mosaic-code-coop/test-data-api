import { ref, watch } from "vue";
import { DEFAULT_LIBRARY, isLibraryId, type LibraryId } from "../libraries";

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const libParam = params.get("library");
  return {
    library: isLibraryId(libParam) ? libParam : DEFAULT_LIBRARY,
    personId: params.get("person"),
  };
}

const initial = typeof window !== "undefined" ? readParams() : { library: DEFAULT_LIBRARY, personId: null };

const library = ref<LibraryId>(initial.library);
const personId = ref<string | null>(initial.personId);

function writeUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("library", library.value);
  if (personId.value) params.set("person", personId.value);
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

watch([library, personId], writeUrl);

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const p = readParams();
    library.value = p.library;
    personId.value = p.personId;
  });
}

export function useUrlState() {
  return { library, personId };
}
