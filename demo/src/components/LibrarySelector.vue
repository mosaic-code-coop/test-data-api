<script setup lang="ts">
import { LIBRARIES, type LibraryId } from "../libraries";

defineProps<{ modelValue: LibraryId }>();
defineEmits<{ (e: "update:modelValue", value: LibraryId): void }>();
</script>

<template>
  <div class="library-selector">
    <label for="library-select">Library</label>
    <select
      id="library-select"
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as LibraryId)"
    >
      <option v-for="lib in LIBRARIES" :key="lib.id" :value="lib.id">
        {{ lib.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.library-selector {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

label {
  font-size: 0.85rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

select {
  font: inherit;
  font-size: 0.95rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.45rem 2rem 0.45rem 0.75rem;
  cursor: pointer;
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-dim) 50%),
    linear-gradient(135deg, var(--text-dim) 50%, transparent 50%);
  background-position:
    calc(100% - 1.1rem) 50%,
    calc(100% - 0.65rem) 50%;
  background-size:
    5px 5px,
    5px 5px;
  background-repeat: no-repeat;
}

select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

select:hover {
  border-color: var(--accent);
}
</style>
