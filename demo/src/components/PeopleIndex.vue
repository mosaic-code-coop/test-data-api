<script setup lang="ts">
import { computed, ref } from "vue";
import type { Person } from "../types";

const props = defineProps<{
  people: Person[];
  currentId: string | null;
}>();

const emit = defineEmits<{ (e: "select-person", id: string): void }>();

const query = ref("");

function matchesQuery(p: Person, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystacks: (string | undefined | null)[] = [
    p.id,
    p.fullName,
    p.englishName,
    p.preferredName,
    p.givenName,
    p.surname,
    p.pronouns,
    p.address?.country,
    ...(p.tags ?? []),
  ];
  return haystacks.some((value) => value != null && value.toLowerCase().includes(needle));
}

const filtered = computed(() => {
  const q = query.value.trim();
  return props.people.filter((p) => matchesQuery(p, q));
});

function displayName(p: Person): string {
  if (p.englishName && p.englishName !== p.fullName) {
    return `${p.fullName} · ${p.englishName}`;
  }
  return p.fullName;
}
</script>

<template>
  <nav class="people-index" aria-label="Profiles">
    <input
      v-model="query"
      type="search"
      class="filter-input"
      placeholder="Filter by name, pronouns, country, tag…"
      aria-label="Filter profiles by name, pronouns, country, or tag"
    />
    <p v-if="filtered.length === 0" class="empty">No matches</p>
    <ul v-else class="name-list">
      <li v-for="p in filtered" :key="p.id">
        <button
          type="button"
          :aria-current="p.id === currentId ? 'true' : undefined"
          :class="{ active: p.id === currentId }"
          @click="emit('select-person', p.id)"
        >
          {{ displayName(p) }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.people-index {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.filter-input {
  font: inherit;
  font-size: 0.9rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.45rem 0.7rem;
}

.filter-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.empty {
  margin: 0.5rem 0;
  color: var(--text-dim);
  font-size: 0.88rem;
}

.name-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.name-list button {
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 0.88rem;
  color: var(--text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  line-height: 1.3;
}

.name-list button:hover {
  background: var(--surface-2);
}

.name-list button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.name-list button.active {
  background: var(--surface-2);
  border-color: var(--accent-warm);
  color: var(--text);
}
</style>
