<script setup lang="ts">
import { LIBRARIES, type LibraryId } from '../libraries';

defineProps<{ modelValue: LibraryId }>();
defineEmits<{ (e: 'update:modelValue', value: LibraryId): void }>();
</script>

<template>
  <fieldset class="library-selector">
    <legend class="visually-hidden">Choose a test data library</legend>
    <label v-for="lib in LIBRARIES" :key="lib.id" class="option">
      <input
        type="radio"
        name="library"
        :value="lib.id"
        :checked="modelValue === lib.id"
        @change="$emit('update:modelValue', lib.id as LibraryId)"
      />
      <span>{{ lib.label }}</span>
    </label>
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
