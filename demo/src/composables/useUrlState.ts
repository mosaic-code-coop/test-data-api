import { ref, watch } from "vue";
import { DEFAULT_LIBRARY, isLibraryId, type LibraryId } from "../libraries";

// Kept in sync with useTheme.ts — avoids a circular import
const VALID_THEMES = ["spicy", "eclipse", "happy", "skyline", "sunrise"] as const;
type Theme = (typeof VALID_THEMES)[number];

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const libParam = params.get("library");
  const themeParam = params.get("theme");
  return {
    library: isLibraryId(libParam) ? libParam : DEFAULT_LIBRARY,
    personId: params.get("person"),
    theme: (VALID_THEMES as readonly string[]).includes(themeParam ?? "") ? (themeParam as Theme) : null,
  };
}

const initial =
  typeof window !== "undefined"
    ? readParams()
    : { library: DEFAULT_LIBRARY, personId: null, theme: null };

const library = ref<LibraryId>(initial.library);
const personId = ref<string | null>(initial.personId);
const urlTheme = ref<Theme | null>(initial.theme);

function writeUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("library", library.value);
  if (personId.value) params.set("person", personId.value);
  else params.delete("person");
  if (urlTheme.value) params.set("theme", urlTheme.value);
  else params.delete("theme");
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

watch([library, personId, urlTheme], writeUrl);

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const p = readParams();
    library.value = p.library;
    personId.value = p.personId;
    urlTheme.value = p.theme;
  });
}

export function useUrlState() {
  return { library, personId, urlTheme };
}
