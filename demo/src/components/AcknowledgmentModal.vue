<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'decline'): void }>();

const confirmBtn = ref<HTMLButtonElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

onMounted(() => {
  previouslyFocused.value = document.activeElement as HTMLElement | null;
  confirmBtn.value?.focus();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  previouslyFocused.value?.focus?.();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('decline');
  }
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="emit('decline')">
    <div
      class="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ack-title"
      aria-describedby="ack-body"
      tabindex="-1"
    >
      <h2 id="ack-title">This library contains names and images of First Nations persons</h2>
      <p id="ack-body">
        Some persons depicted may be deceased. Please confirm that you wish to proceed.
      </p>
      <div class="actions">
        <button type="button" @click="emit('decline')">Use STEM library instead</button>
        <button ref="confirmBtn" type="button" class="primary" @click="emit('confirm')">
          I acknowledge — continue
        </button>
      </div>
    </div>
  </div>
</template>
