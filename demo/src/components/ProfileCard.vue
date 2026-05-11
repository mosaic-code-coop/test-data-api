<script setup lang="ts">
import { computed } from 'vue';
import type { DataFactory, Person } from '../types';

const props = defineProps<{ person: Person; factory: DataFactory }>();
const emit = defineEmits<{
  (e: 'select-related', payload: { type: 'group' | 'event' | 'tag' | 'country'; id: string }): void;
}>();

const baseUrl = import.meta.env.BASE_URL || '/';
const portrait = computed(() => props.person.picture ?? `${baseUrl}silhouette.svg`);

const subtitle = computed(() => {
  const parts: string[] = [];
  if (props.person.englishName) parts.push(props.person.englishName);
  if (props.person.preferredName && props.person.preferredName !== props.person.fullName) {
    parts.push(`also "${props.person.preferredName}"`);
  }
  return parts.join(' · ');
});

const groups = computed(() => {
  return (props.person.groupMemberships ?? [])
    .map((id) => props.factory.getGroup(id))
    .filter((g): g is NonNullable<ReturnType<DataFactory['getGroup']>> => g !== null);
});

const events = computed(() => {
  return props.factory.getEvents().filter((ev) => ev.attendeeIds.includes(props.person.id));
});

const nameParts = computed(() => {
  const parts: { label: string; value: string }[] = [];
  if (props.person.givenName) parts.push({ label: 'Given name', value: props.person.givenName });
  if (props.person.surname) parts.push({ label: 'Surname', value: props.person.surname });
  return parts;
});

const dobLabel = computed(() => {
  const dob = props.person.dateOfBirth;
  if (!dob) return null;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
});

const addressLines = computed(() => {
  const a = props.person.address;
  if (!a) return null;
  const cityRegion = [a.city, a.state].filter(Boolean).join(', ');
  return [a.street, cityRegion, [a.country, a.zipCode].filter(Boolean).join(' ')].filter(Boolean);
});

const silhouette = `${baseUrl}silhouette.svg`;

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  if (img.src.endsWith('silhouette.svg')) return;
  img.src = silhouette;
}
</script>

<template>
  <article class="profile-card" aria-live="polite">
    <img
      class="portrait"
      :src="portrait"
      :alt="`Portrait of ${person.fullName}`"
      loading="lazy"
      @error="onImageError"
    />
    <div class="body">
      <h2>{{ person.fullName }}</h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      <div class="badges">
        <span v-if="person.pronouns" class="pronouns">{{ person.pronouns }}</span>
        <button
          v-if="person.address?.country"
          type="button"
          class="pronouns country"
          @click="emit('select-related', { type: 'country', id: person.address.country })"
        >
          {{ person.address.country }}
        </button>
      </div>
      <p v-if="person.bio" class="bio">{{ person.bio }}</p>

      <div v-if="person.tags.length" class="chip-group">
        <span class="label">Tags:</span>
        <button
          v-for="tag in person.tags"
          :key="tag"
          type="button"
          class="chip"
          @click="emit('select-related', { type: 'tag', id: tag })"
        >
          {{ tag }}
        </button>
      </div>

      <div v-if="groups.length" class="chip-group">
        <span class="label">Groups:</span>
        <button
          v-for="g in groups"
          :key="g.id"
          type="button"
          class="chip"
          @click="emit('select-related', { type: 'group', id: g.id })"
        >
          {{ g.name }}
        </button>
      </div>

      <div v-if="events.length" class="chip-group">
        <span class="label">Events:</span>
        <button
          v-for="ev in events"
          :key="ev.id"
          type="button"
          class="chip"
          @click="emit('select-related', { type: 'event', id: ev.id })"
        >
          {{ ev.name }}
        </button>
      </div>

      <blockquote v-if="person.quote">
        “{{ person.quote }}”
        <cite v-if="person.quoteReference">
          <a :href="person.quoteReference" target="_blank" rel="noopener">source</a>
        </cite>
      </blockquote>

      <section
        v-if="
          nameParts.length ||
          dobLabel ||
          person.email ||
          person.phone ||
          addressLines ||
          person.reference
        "
        class="test-data"
        aria-label="Profile fields"
      >
        <h3 class="test-data-heading">Profile fields</h3>
        <dl>
          <template v-for="part in nameParts" :key="part.label">
            <dt>{{ part.label }}</dt>
            <dd>{{ part.value }}</dd>
          </template>
          <template v-if="dobLabel">
            <dt>Date of birth</dt>
            <dd>{{ dobLabel }}</dd>
          </template>
          <template v-if="person.email">
            <dt>Email</dt>
            <dd><a :href="`mailto:${person.email}`">{{ person.email }}</a></dd>
          </template>
          <template v-if="person.phone">
            <dt>Phone</dt>
            <dd>{{ person.phone }}</dd>
          </template>
          <template v-if="addressLines">
            <dt>Address</dt>
            <dd>
              <span v-for="(line, i) in addressLines" :key="i" class="address-line">{{ line }}</span>
            </dd>
          </template>
          <template v-if="person.reference">
            <dt>Source</dt>
            <dd>
              <a :href="person.reference" target="_blank" rel="noopener">{{ person.reference }} ↗</a>
            </dd>
          </template>
        </dl>
      </section>
    </div>
  </article>
</template>
