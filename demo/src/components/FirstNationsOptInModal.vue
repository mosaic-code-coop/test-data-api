<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits<{ (e: "include"): void; (e: "exclude"): void }>();

const includeBtn = ref<HTMLButtonElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

onMounted(() => {
  previouslyFocused.value = document.activeElement as HTMLElement | null;
  includeBtn.value?.focus();
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  previouslyFocused.value?.focus?.();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("exclude");
  }
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="emit('exclude')">
    <div
      class="modal ack-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fn-optin-title"
      aria-describedby="fn-optin-body"
      tabindex="-1"
    >
      <h2 id="fn-optin-title">This library contains names and images of First Nations people</h2>
      <p id="fn-optin-body">Some persons may be deceased. Would you like to include them?</p>
      <div class="actions">
        <button type="button" @click="emit('exclude')">Do not show First Nations people</button>
        <button ref="includeBtn" type="button" class="primary" @click="emit('include')">
          Include First Nations
        </button>
      </div>
    </div>
  </div>
</template>
