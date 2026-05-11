<script setup lang="ts">
import { ref, computed } from 'vue';
import LibrarySelector from './components/LibrarySelector.vue';
import AcknowledgmentModal from './components/AcknowledgmentModal.vue';
import ProfileCard from './components/ProfileCard.vue';
import RelatedExpander from './components/RelatedExpander.vue';
import { useFactory } from './composables/useFactory';
import { LIBRARIES, FRAMEWORK_REPO_URL } from './libraries';

const {
  library,
  current,
  factory,
  isLoading,
  loadError,
  requiresPrompt,
  confirmAcknowledgment,
  declineAcknowledgment,
  next: nextPerson,
  prev: prevPerson,
  random: randomPerson,
  setPerson,
} = useFactory();

const expanded = ref<{ type: 'group' | 'event' | 'tag' | 'country'; id: string } | null>(null);

function onSelectRelated(payload: { type: 'group' | 'event' | 'tag' | 'country'; id: string }) {
  expanded.value =
    expanded.value?.id === payload.id && expanded.value.type === payload.type ? null : payload;
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
</script>

<template>
  <main class="app">
    <header class="app-header">
      <p class="kicker">Test Data Factory</p>
      <h1>Names worth remembering, in your test data</h1>
      <p class="lede">
        I've always found test data easier to reason about when it tells real stories.
        Concrete people are easier to follow than "Test User 1" or Alice and Bob. Given how
        often marginalised contributions are written out, including them in our demo data and
        test suites is one small way we can refuse to participate in erasure.
      </p>
    </header>

    <LibrarySelector v-model="library" />

    <div class="controls" v-if="!requiresPrompt && !loadError">
      <button type="button" @click="prev" aria-label="Previous profile">← Previous</button>
      <button type="button" @click="random" aria-label="Random profile">🎲 Random</button>
      <button type="button" @click="next" aria-label="Next profile">Next →</button>
    </div>

    <AcknowledgmentModal
      v-if="requiresPrompt"
      @confirm="confirmAcknowledgment"
      @decline="declineAcknowledgment"
    />

    <div v-else-if="loadError" class="status error" role="alert">
      Failed to load library: {{ loadError }}
    </div>

    <div v-else-if="isLoading" class="status">Loading…</div>

    <template v-else-if="current && factory">
      <ProfileCard :person="current" :factory="factory" @select-related="onSelectRelated" />
      <RelatedExpander
        v-if="expanded"
        :factory="factory"
        :type="expanded.type"
        :id="expanded.id"
        @select-person="onSelectPerson"
      />
    </template>

    <nav class="footer-links" aria-label="Repository links">
      <a :href="FRAMEWORK_REPO_URL" target="_blank" rel="noopener">Framework repo ↗</a>
      <a :href="currentLibrary.repoUrl" target="_blank" rel="noopener"
        >{{ currentLibrary.label }} repo ↗</a
      >
      <a :href="issueUrl" class="danger" target="_blank" rel="noopener"
        >See something incorrect? Open an issue ↗</a
      >
    </nav>
  </main>
</template>
