import { ref, onMounted } from "vue";

const CACHE_TTL_MS = 60 * 60 * 1000;

type Cached = { stars: number; fetchedAt: number };

function cacheKey(repoUrl: string): string {
  return `gh-stars:${repoUrl}`;
}

function readCache(repoUrl: string): number | null {
  try {
    const raw = localStorage.getItem(cacheKey(repoUrl));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.stars;
  } catch {
    return null;
  }
}

function writeCache(repoUrl: string, stars: number): void {
  try {
    const value: Cached = { stars, fetchedAt: Date.now() };
    localStorage.setItem(cacheKey(repoUrl), JSON.stringify(value));
  } catch {
    // localStorage unavailable — ignore.
  }
}

export function useGitHubStars(repoUrl: string) {
  const stars = ref<number | null>(null);

  onMounted(async () => {
    const cached = readCache(repoUrl);
    if (cached !== null) {
      stars.value = cached;
      return;
    }
    const apiPath = repoUrl.replace(/^https:\/\/github\.com\//, "");
    try {
      const res = await fetch(`https://api.github.com/repos/${apiPath}`);
      if (!res.ok) return;
      const data = (await res.json()) as { stargazers_count?: number };
      if (typeof data.stargazers_count === "number") {
        stars.value = data.stargazers_count;
        writeCache(repoUrl, data.stargazers_count);
      }
    } catch {
      // network failure — leave stars null, pill hides count.
    }
  });

  return { stars };
}
