import { ref, onMounted } from "vue";
import { useUrlState } from "./useUrlState";

export const THEMES = ["spicy", "eclipse", "happy", "skyline", "sunrise"] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "theme:current";
const DEFAULT_THEME: Theme = "spicy";

function readStored(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (THEMES as readonly string[]).includes(raw)) return raw as Theme;
  } catch {
    // localStorage unavailable — fall through.
  }
  return DEFAULT_THEME;
}

function writeStored(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — ignore.
  }
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const { urlTheme } = useUrlState();
  const theme = ref<Theme>(DEFAULT_THEME);

  onMounted(() => {
    theme.value = urlTheme.value ?? readStored();
    apply(theme.value);
  });

  function cycleTheme() {
    const idx = THEMES.indexOf(theme.value);
    const next = THEMES[(idx + 1) % THEMES.length];
    theme.value = next;
    apply(next);
    writeStored(next);
    urlTheme.value = next;
  }

  return { theme, cycleTheme };
}
