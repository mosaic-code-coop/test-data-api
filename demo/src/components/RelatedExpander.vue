<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DataFactory, Person } from '../types';
import { editRecordUrl, type LibraryConfig } from '../libraries';

type RelatedType = 'group' | 'event' | 'tag' | 'country';

const props = defineProps<{
  factory: DataFactory;
  type: RelatedType;
  id: string;
  library: LibraryConfig;
}>();

const emit = defineEmits<{ (e: 'select-person', personId: string): void }>();

const showAll = ref(false);

watch(
  () => [props.type, props.id],
  () => {
    showAll.value = false;
  },
);

const groupDetail = computed(() =>
  props.type === 'group' ? props.factory.getGroup(props.id) : null,
);
const eventDetail = computed(() =>
  props.type === 'event' ? props.factory.getEvent(props.id) : null,
);

const title = computed(() => {
  if (groupDetail.value) return groupDetail.value.name;
  if (eventDetail.value) return eventDetail.value.name;
  if (props.type === 'tag') return `#${props.id}`;
  if (props.type === 'country') return props.id;
  return '';
});

const members = computed<Person[]>(() => {
  if (props.type === 'group') return props.factory.getPeopleInGroup(props.id);
  if (props.type === 'event') {
    const ev = props.factory.getEvent(props.id);
    if (!ev) return [];
    return ev.attendeeIds
      .map((id) => props.factory.getPerson(id))
      .filter((p): p is Person => p !== null);
  }
  if (props.type === 'tag') return props.factory.getPeopleByTag(props.id);
  if (props.type === 'country') {
    return props.factory.getPeople().filter((p) => p.address?.country === props.id);
  }
  return [];
});

function verbFor(type: RelatedType, count: number): string {
  if (type === 'group') return count === 1 ? 'is a member' : 'are members';
  if (type === 'event') return 'attended';
  if (type === 'tag') return count === 1 ? 'is tagged' : 'are tagged';
  if (type === 'country') return count === 1 ? 'is from here' : 'are from here';
  return '';
}

const summary = computed(() => {
  const all = members.value;
  if (all.length === 0) return null;
  const spelled = all.slice(0, 2);
  const rest = Math.max(0, all.length - 2);
  return { spelled, rest, verb: verbFor(props.type, all.length) };
});

const dateLabel = computed(() => {
  const ev = eventDetail.value;
  if (!ev?.date) return null;
  const d = typeof ev.date === 'string' ? new Date(ev.date) : ev.date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
});

const stripMembers = computed(() => members.value.filter((m) => m.picture).slice(0, 6));

const aboutText = computed(() => groupDetail.value?.about ?? '');

const groupExtras = computed(() => {
  const g = groupDetail.value;
  if (!g) return null;
  return { email: g.email ?? null, website: g.website ?? null, picture: g.picture ?? null };
});

const referenceUrl = computed(() => {
  return groupDetail.value?.reference ?? eventDetail.value?.reference ?? null;
});

const isLightweight = computed(() => props.type === 'tag' || props.type === 'country');

const editUrl = computed(() => {
  if (props.type !== 'group' && props.type !== 'event') return null;
  return editRecordUrl(props.library, props.type, props.id);
});
</script>

<template>
  <section v-if="title" class="expander" aria-live="polite">
    <header class="expander-header">
      <img
        v-if="groupExtras?.picture"
        class="group-picture"
        :src="groupExtras.picture"
        :alt="`Picture of ${title}`"
        loading="lazy"
      />
      <div>
        <h3>{{ title }}</h3>
        <p v-if="dateLabel" class="event-date">{{ dateLabel }}</p>
      </div>
    </header>

    <p v-if="aboutText">{{ aboutText }}</p>

    <dl v-if="groupExtras?.email || groupExtras?.website || referenceUrl" class="extras">
      <template v-if="groupExtras?.website">
        <dt>Website</dt>
        <dd>
          <a :href="groupExtras.website" target="_blank" rel="noopener"
            >{{ groupExtras.website }} ↗</a
          >
        </dd>
      </template>
      <template v-if="groupExtras?.email">
        <dt>Email</dt>
        <dd><a :href="`mailto:${groupExtras.email}`">{{ groupExtras.email }}</a></dd>
      </template>
      <template v-if="referenceUrl">
        <dt>Source</dt>
        <dd><a :href="referenceUrl" target="_blank" rel="noopener">{{ referenceUrl }} ↗</a></dd>
      </template>
    </dl>

    <div v-if="!isLightweight && stripMembers.length" class="member-strip">
      <button
        v-for="m in stripMembers"
        :key="m.id"
        type="button"
        :title="m.fullName"
        :aria-label="`View profile for ${m.fullName}`"
        @click="emit('select-person', m.id)"
      >
        <img :src="m.picture ?? ''" :alt="m.fullName" loading="lazy" />
      </button>
    </div>

    <p v-if="summary && !showAll" class="member-summary">
      <template v-for="(p, i) in summary.spelled" :key="p.id">
        <button type="button" class="link" @click="emit('select-person', p.id)">
          {{ p.fullName }}
        </button>
        <template v-if="i < summary.spelled.length - 1 && summary.rest === 0">{{
          i === summary.spelled.length - 2 ? ' and ' : ', '
        }}</template>
        <template v-else-if="i < summary.spelled.length - 1">, </template>
      </template>
      <template v-if="summary.rest > 0">
        and
        <button type="button" class="link" @click="showAll = true">
          {{ summary.rest }} other{{ summary.rest === 1 ? '' : 's' }}
        </button>
      </template>
      {{ ' ' + summary.verb }}.
    </p>

    <p v-if="editUrl" class="edit-cta">
      <a :href="editUrl" target="_blank" rel="noopener">Propose a Change (Open a PR) ↗</a>
    </p>

    <div v-if="summary && showAll" class="full-members">
      <p class="member-count">{{ members.length }} {{ summary.verb }}:</p>
      <ul>
        <li v-for="m in members" :key="m.id">
          <button type="button" class="link" @click="emit('select-person', m.id)">
            {{ m.fullName }}
          </button>
        </li>
      </ul>
      <button type="button" class="link" @click="showAll = false">Show fewer</button>
    </div>
  </section>
</template>

<style scoped>
.expander-header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.expander-header h3 {
  margin: 0;
}

.group-picture {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.event-date {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.extras {
  margin: 0.5rem 0 0.75rem;
  display: grid;
  grid-template-columns: minmax(80px, max-content) 1fr;
  column-gap: 1rem;
  row-gap: 0.2rem;
  font-size: 0.88rem;
}

.extras dt {
  color: var(--text-dim);
}

.extras dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.full-members {
  margin-top: 0.5rem;
}

.member-count {
  margin: 0 0 0.4rem;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.full-members ul {
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.2rem 0.75rem;
}

.full-members li {
  font-size: 0.9rem;
}

button.link {
  background: none;
  border: none;
  color: var(--accent);
  padding: 0;
  cursor: pointer;
  font: inherit;
}

button.link:hover {
  text-decoration: underline;
}

.edit-cta {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.85rem;
}

.edit-cta a {
  color: var(--accent-warm);
}
</style>
