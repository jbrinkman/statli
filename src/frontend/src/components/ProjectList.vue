<template>
  <div class="project-list" role="region" aria-label="Project list">
    <!-- Header -->
    <div class="header">
      <h2 class="title">Projects</h2>
      <button 
        @click="$emit('create')" 
        class="btn-create"
        aria-label="Create new project (Ctrl+N)"
      >
        Create Project
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading" role="status" aria-live="polite">
      <LoadingSpinner size="large" message="Loading projects..." />
    </div>

    <!-- Active Projects -->
    <div v-if="!loading" class="projects-section">
      <h3 class="section-title">Active Projects</h3>
      <div v-if="activeProjects.length === 0" class="empty-state" role="status">
        No active projects. Create one to get started.
      </div>
      <div 
        v-else 
        class="project-items" 
        role="list" 
        aria-label="Active projects"
      >
        <button
          v-for="project in activeProjects"
          :key="project.id"
          @click="$emit('select', project)"
          @keydown.enter="$emit('select', project)"
          @keydown.space.prevent="$emit('select', project)"
          class="project-item"
          :class="{ selected: selectedProjectId === project.id }"
          role="listitem"
          :aria-label="`Select project ${project.name}, created ${formatDate(project.created_at)}`"
          :aria-current="selectedProjectId === project.id ? 'true' : undefined"
          :data-project-id="project.id"
        >
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">
            Created: {{ formatDate(project.created_at) }}
          </div>
        </button>
      </div>
    </div>

    <!-- Archived Projects -->
    <div v-if="!loading && showArchived" class="projects-section">
      <h3 class="section-title">Archived Projects</h3>
      <div v-if="archivedProjects.length === 0" class="empty-state" role="status">
        No archived projects.
      </div>
      <div 
        v-else 
        class="project-items" 
        role="list" 
        aria-label="Archived projects"
      >
        <button
          v-for="project in archivedProjects"
          :key="project.id"
          @click="$emit('select', project)"
          @keydown.enter="$emit('select', project)"
          @keydown.space.prevent="$emit('select', project)"
          class="project-item archived"
          :class="{ selected: selectedProjectId === project.id }"
          role="listitem"
          :aria-label="`Select archived project ${project.name}, archived ${formatDate(project.updated_at)}`"
          :aria-current="selectedProjectId === project.id ? 'true' : undefined"
        >
          <div class="project-name">{{ project.name }}</div>
          <div class="project-meta">
            Archived: {{ formatDate(project.updated_at) }}
          </div>
        </button>
      </div>
    </div>

    <!-- Toggle Archived -->
    <button
      v-if="!loading"
      @click="toggleArchived"
      class="btn-toggle-archived"
      :aria-label="`${showArchived ? 'Hide' : 'Show'} archived projects`"
      :aria-expanded="showArchived"
    >
      {{ showArchived ? 'Hide' : 'Show' }} Archived Projects
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';
import type { Project } from '../composables/useProjects';

// Props
interface Props {
  activeProjects: Project[];
  archivedProjects: Project[];
  loading?: boolean;
  error?: string | null;
  selectedProjectId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  selectedProjectId: null,
});

// Emits
defineEmits<{
  create: [];
  select: [project: Project];
}>();

// Local state
const showArchived = ref(false);

// Methods
const toggleArchived = () => {
  showArchived.value = !showArchived.value;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};
</script>

<style scoped>
.project-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
}

@media (min-width: 768px) {
  .project-list {
    padding: 1.5rem;
  }
}

.header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

@media (min-width: 640px) {
  .header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

@media (min-width: 768px) {
  .title {
    font-size: 1.5rem;
  }
}

.btn-create {
  padding: 0.5rem 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-create:hover {
  background-color: #1557b0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-create:active {
  transform: scale(0.98);
}

.loading {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loading::before {
  content: '';
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  padding: 1rem;
  text-align: center;
  color: #c00;
  background-color: #fee;
  border-radius: 0.375rem;
  border: 1px solid #fcc;
}

.projects-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  border: 1px dashed #d1d5db;
}

.project-items {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .project-items {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .project-items {
    grid-template-columns: repeat(3, 1fr);
  }
}

.project-item {
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
  font-family: inherit;
}

.project-item:hover {
  background-color: #e8f0fe;
  border-color: #1a73e8;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.project-item.selected {
  background-color: #e8f0fe;
  border-color: #1a73e8;
  border-width: 2px;
  padding: calc(1rem - 1px);
}

.project-item.archived {
  opacity: 0.6;
}

.project-item.archived:hover {
  opacity: 0.8;
}

.project-name {
  font-size: 1rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.project-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.btn-toggle-archived {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #1a73e8;
  border: 1px solid #1a73e8;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-toggle-archived:hover {
  background-color: #e8f0fe;
}

.btn-toggle-archived:active {
  transform: scale(0.98);
}
</style>
