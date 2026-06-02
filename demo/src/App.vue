<script setup lang="ts">
import { ref, computed, useTemplateRef } from "vue";
import LibrarySelector from "./components/LibrarySelector.vue";
import AcknowledgmentModal from "./components/AcknowledgmentModal.vue";
import FirstNationsOptInModal from "./components/FirstNationsOptInModal.vue";
import ProfileCard from "./components/ProfileCard.vue";
import RelatedExpander from "./components/RelatedExpander.vue";
import PeopleIndex from "./components/PeopleIndex.vue";
import { useFactory } from "./composables/useFactory";
import { useGitHubStars } from "./composables/useGitHubStars";
import { useTheme, type Theme } from "./composables/useTheme";
import { LIBRARIES, FRAMEWORK_REPO_URL, starsBadgeUrl, stargazersUrl, addPersonUrl } from "./libraries";

const THEME_META: Record<Theme, { icon: string; label: string }> = {
  spicy: { icon: "🌶️", label: "Spicy" },
  eclipse: { icon: "🌙", label: "Eclipse" },
  happy: { icon: "☁️", label: "Happy" },
  skyline: { icon: "🌇", label: "Skyline" },
  sunrise: { icon: "🌻", label: "Sunrise" },
};

const { theme, cycleTheme } = useTheme();

const {
  library,
  current,
  factory,
  people,
  isLoading,
  loadError,
  requiresPrompt,
  confirmAcknowledgment,
  declineAcknowledgment,
  requiresFirstNationsPrompt,
  confirmFirstNationsOptIn,
  next: nextPerson,
  prev: prevPerson,
  random: randomPerson,
  setPerson,
} = useFactory();

// Order matches the 6x4 grid in scripts/og-lgbtq.json (left-to-right, top-to-bottom).
// Update both lists together if the OG image is regenerated. All IDs live in the lgbtq-figures library.
const COVER_IMAGE_PEOPLE = [
  { id: "alan-turing", name: "Alan Turing" },
  { id: "frank-mugisha", name: "Frank Mugisha" },
  { id: "bayard-rustin", name: "Bayard Rustin" },
  { id: "sally-ride", name: "Sally Ride" },
  { id: "james-baldwin", name: "James Baldwin" },
  { id: "kasha-jacqueline-nabagesera", name: "Kasha Jacqueline Nabagesera" },
  { id: "lili-elbe", name: "Lili Elbe" },
  { id: "leo-varadkar", name: "Leo Varadkar" },
  { id: "albert-cashier", name: "Albert Cashier" },
  { id: "marsha-p-johnson", name: "Marsha P. Johnson" },
  { id: "magnus-hirschfeld", name: "Magnus Hirschfeld" },
  { id: "tammy-baldwin", name: "Tammy Baldwin" },
  { id: "audre-lorde", name: "Audre Lorde" },
  { id: "xavier-bettel", name: "Xavier Bettel" },
  { id: "simon-nkoli", name: "Simon Nkoli" },
  { id: "beverley-palesa-ditsie", name: "Beverley Palesa Ditsie" },
  { id: "frank-kameny", name: "Frank Kameny" },
  { id: "manvendra-singh-gohil", name: "Manvendra Singh Gohil" },
  { id: "harvey-milk", name: "Harvey Milk" },
  { id: "johanna-sigurdardottir", name: "Jóhanna Sigurðardóttir" },
  { id: "emperor-ai-of-han", name: "Emperor Ai of Han" },
  { id: "pedro-lemebel", name: "Pedro Lemebel" },
  { id: "chevalier-deon", name: "Chevalier d'Éon" },
  { id: "vladimir-luxuria", name: "Vladimir Luxuria" },
] as const;

// Retained for if we return to the STEM women/BIPOC cover image (og-image-stem-women.png, 5x4 grid).
// All IDs live in the stem library.
// const COVER_IMAGE_PEOPLE = [
//   { id: "katherine-johnson", name: "Katherine Johnson" },
//   { id: "ada-lovelace", name: "Ada Lovelace" },
//   { id: "marie-curie", name: "Marie Curie" },
//   { id: "dorothy-vaughan", name: "Dorothy Vaughan" },
//   { id: "mamie-phipps-clark", name: "Mamie Phipps Clark" },
//   { id: "annie-easley", name: "Annie Easley" },
//   { id: "charlotte-angas-scott", name: "Charlotte Angas Scott" },
//   { id: "maria-gaetana-agnesi", name: "Maria Gaetana Agnesi" },
//   { id: "dorothy-hodgkin", name: "Dorothy Hodgkin" },
//   { id: "maria-mitchell", name: "Maria Mitchell" },
//   { id: "lise-meitner", name: "Lise Meitner" },
//   { id: "sophia-brahe", name: "Sophia Brahe" },
//   { id: "elena-cornaro-piscopia", name: "Elena Cornaro Piscopia" },
//   { id: "wangari-maathai-scientist", name: "Wangari Maathai" },
//   { id: "quarraisha-abdool-karim", name: "Quarraisha Abdool Karim" },
//   { id: "christina-koch", name: "Christina Koch" },
//   { id: "jessica-watkins", name: "Jessica Watkins" },
//   { id: "vanessa-wyche", name: "Vanessa Wyche" },
//   { id: "jane-goodall", name: "Jane Goodall" },
//   { id: "grace-hopper", name: "Grace Hopper" },
// ] as const;

const base = import.meta.env.BASE_URL;
const coverImageUrl = `${base}og-image.png`;

const expanded = ref<{ type: "group" | "event" | "tag" | "country"; id: string } | null>(null);

function selectFromCover(id: string) {
  if (library.value !== "lgbtq-figures") library.value = "lgbtq-figures";
  setPerson(id);
  expanded.value = null;
}

function onSelectRelated(payload: { type: "group" | "event" | "tag" | "country"; id: string }) {
  expanded.value = expanded.value?.id === payload.id && expanded.value.type === payload.type ? null : payload;
}

function onSelectPerson(personId: string) {
  setPerson(personId);
  expanded.value = null;
}

function next() {
  expanded.value = null;
  nextPerson();
}

function prev() {
  expanded.value = null;
  prevPerson();
}

function random() {
  expanded.value = null;
  randomPerson();
}

const currentLibrary = computed(() => LIBRARIES[library.value]);

const issueUrl = computed(() => {
  if (!current.value) return `${currentLibrary.value.repoUrl}/issues/new`;
  const permalink = `${window.location.origin}${window.location.pathname}?library=${library.value}&person=${current.value.id}`;
  const title = encodeURIComponent(`Correction: ${current.value.fullName}`);
  const body = encodeURIComponent(
    `Profile: ${permalink}\nProfile ID: ${current.value.id}\nLibrary: ${currentLibrary.value.npmName}\n\nField needing correction:\n\nWhat should be different:\n`,
  );
  return `${currentLibrary.value.repoUrl}/issues/new?title=${title}&body=${body}`;
});

const browseDialog = useTemplateRef<HTMLDialogElement>("browseDialog");

function openBrowse() {
  browseDialog.value?.showModal();
}

function closeBrowse() {
  browseDialog.value?.close();
}

function onSelectPersonFromDrawer(id: string) {
  onSelectPerson(id);
  closeBrowse();
}

const { stars: frameworkStars } = useGitHubStars(FRAMEWORK_REPO_URL);

const personAddUrl = computed(() => addPersonUrl(currentLibrary.value));
</script>

<template>
  <div class="app">
    <button type="button" class="mobile-menu-btn" aria-label="Open profile list" @click="openBrowse">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    </button>
    <div class="gh-corner">
      <button
        type="button"
        class="gh-corner__theme"
        :aria-label="`Switch theme — currently ${THEME_META[theme].label}`"
        @click="cycleTheme"
      >
        <span class="gh-corner__theme-icon" aria-hidden="true">{{ THEME_META[theme].icon }}</span>
        <span class="gh-corner__label">{{ THEME_META[theme].label }}</span>
      </button>
      <a
        class="gh-corner__mosaic"
        href="https://github.com/mosaic-code-coop"
        target="_blank"
        rel="noopener"
        aria-label="Mosaic Code Co-op on GitHub"
      >
        <img :src="`${base}favicon-32.png`" alt="" width="18" height="18" class="gh-corner__mosaic-icon" />
        <span class="gh-corner__label">Mosaic</span>
      </a>
      <a
        class="gh-corner__cta"
        :href="FRAMEWORK_REPO_URL"
        target="_blank"
        rel="noopener"
        aria-label="View source on GitHub — use this framework in your project"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
          />
        </svg>
        <span class="gh-corner__label">Use this</span>
      </a>
      <a
        class="gh-corner__stars"
        :href="stargazersUrl(FRAMEWORK_REPO_URL)"
        target="_blank"
        rel="noopener"
        :aria-label="frameworkStars !== null ? `${frameworkStars} stars on GitHub` : 'Star on GitHub'"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" class="gh-corner__star-icon">
          <path
            fill="currentColor"
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          />
        </svg>
        <span class="gh-corner__count">{{ frameworkStars ?? "—" }}</span>
      </a>
    </div>

    <aside class="sidebar">
      <PeopleIndex
        :people="people"
        :current-id="current?.id ?? null"
        :add-url="personAddUrl"
        @select-person="onSelectPerson"
      />
    </aside>

    <main class="main-pane">
      <header class="app-header">
        <p class="kicker">Test Data Factory</p>
        <h1>Stories Worth Remembering</h1>
        <p class="lede">
          I've always found example data easier to reason about when it tells real stories. Concrete people are easier to
          follow than "Test User 1" or Alice and Bob.
        </p>
        <p class="lede">
          Knowing how often marginalised contributions are written out, including them in our demo data and test suites is
          one small way we can refuse to participate in erasure.
        </p>

        <p class="lede">
          This library contains brief stories of people often overlooked throughout history in a structured format that
	  can be easily imported into test suites and demo data. In our day to day as software engineers we can learn about the many
	  and varied contributions all humanity has made to human progress. 
        </p>
        <details class="cover-pane">
          <summary>Who's in the cover image</summary>
          <div class="cover-pane-body">
            <img
              :src="coverImageUrl"
              alt="Grayscale 6×4 grid of portraits of 24 LGBTQ+ figures"
              loading="lazy"
              width="600"
              height="315"
            />
            <ol class="cover-people" aria-label="People in the cover image, left to right, top to bottom">
              <li v-for="p in COVER_IMAGE_PEOPLE" :key="p.id">
                <button type="button" class="cover-link" @click="selectFromCover(p.id)">
                  {{ p.name }}
                </button>
              </li>
            </ol>
          </div>
        </details>
      </header>

      <div class="content-controls">
        <LibrarySelector v-model="library" />
      </div>

      <div class="controls" v-if="!requiresPrompt && !loadError">
        <button type="button" @click="prev" aria-label="Previous profile">← Previous</button>
        <button type="button" @click="random" aria-label="Random profile">Random</button>
        <button type="button" @click="next" aria-label="Next profile">Next →</button>
      </div>

      <AcknowledgmentModal v-if="requiresPrompt" @confirm="confirmAcknowledgment" @decline="declineAcknowledgment" />
      <FirstNationsOptInModal
        v-else-if="requiresFirstNationsPrompt"
        @include="confirmFirstNationsOptIn(true)"
        @exclude="confirmFirstNationsOptIn(false)"
      />

      <div v-else-if="loadError" class="status error" role="alert">Failed to load library: {{ loadError }}</div>

      <div v-else-if="isLoading" class="status">Loading…</div>

      <template v-else-if="current && factory">
        <ProfileCard :person="current" :factory="factory" :library="currentLibrary" @select-related="onSelectRelated" />
        <RelatedExpander
          v-if="expanded"
          :factory="factory"
          :type="expanded.type"
          :id="expanded.id"
          :library="currentLibrary"
          @select-person="onSelectPerson"
        />
      </template>

      <nav class="footer-links" aria-label="Repository links">
        <span class="repo-link-group">
          <a :href="`${FRAMEWORK_REPO_URL}#readme`" target="_blank" rel="noopener">Framework quickstart ↗</a>
          <a
            :href="stargazersUrl(FRAMEWORK_REPO_URL)"
            target="_blank"
            rel="noopener"
            class="star-badge"
            aria-label="Star the framework on GitHub"
          >
            <img :src="starsBadgeUrl(FRAMEWORK_REPO_URL)" alt="GitHub stars" loading="lazy" height="18" />
          </a>
        </span>
        <span class="repo-link-group">
          <a :href="`${currentLibrary.repoUrl}#readme`" target="_blank" rel="noopener"
            >{{ currentLibrary.label }} quickstart ↗</a
          >
          <a
            :href="stargazersUrl(currentLibrary.repoUrl)"
            target="_blank"
            rel="noopener"
            class="star-badge"
            :aria-label="`Star ${currentLibrary.label} on GitHub`"
          >
            <img :src="starsBadgeUrl(currentLibrary.repoUrl)" alt="GitHub stars" loading="lazy" height="18" />
          </a>
        </span>
        <a :href="issueUrl" class="warm" target="_blank" rel="noopener">See something incorrect? Open an issue ↗</a>
      </nav>
    </main>

    <dialog ref="browseDialog" class="browse-dialog" @click.self="closeBrowse">
      <div class="browse-dialog-body">
        <header class="browse-dialog-header">
          <h2>Browse profiles</h2>
          <button type="button" class="close-btn" aria-label="Close" @click="closeBrowse">✕</button>
        </header>
        <PeopleIndex :people="people" :current-id="current?.id ?? null" @select-person="onSelectPersonFromDrawer" />
      </div>
    </dialog>
  </div>
</template>
