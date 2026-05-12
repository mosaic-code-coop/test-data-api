<script setup lang="ts">
import { LIBRARIES, starsBadgeUrl, stargazersUrl, type LibraryId } from '../libraries';

defineProps<{ modelValue: LibraryId }>();
defineEmits<{ (e: 'update:modelValue', value: LibraryId): void }>();
</script>

<template>
  <fieldset class="library-selector">
    <legend class="visually-hidden">Choose a test data library</legend>
    <div v-for="lib in LIBRARIES" :key="lib.id" class="option-row">
      <label class="option">
        <input
          type="radio"
          name="library"
          :value="lib.id"
          :checked="modelValue === lib.id"
          @change="$emit('update:modelValue', lib.id as LibraryId)"
        />
        <span>{{ lib.label }}</span>
      </label>
      <a
        :href="stargazersUrl(lib.repoUrl)"
        target="_blank"
        rel="noopener"
        class="star-badge"
        :aria-label="`Star ${lib.label} on GitHub`"
      >
        <img :src="starsBadgeUrl(lib.repoUrl)" alt="GitHub stars" loading="lazy" height="20" />
      </a>
    </div>
  </fieldset>
</template>

<style scoped>
.library-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem;
  background: var(--surface);
  margin: 0;
}

.option-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}

.option:has(input:checked) {
  background: var(--surface-2);
}

.star-badge {
  display: inline-flex;
  align-items: center;
  line-height: 0;
}

.star-badge img {
  display: block;
}

.option input {
  accent-color: var(--accent);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
