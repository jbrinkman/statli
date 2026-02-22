<template>
  <div class="report-section-list">
    <!-- Header -->
    <div class="header">
      <h2 class="title">Report Sections</h2>
      <button @click="$emit('create-section')" class="btn-create">
        Create Section
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading sections...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- Sections List -->
    <div v-if="!loading && !error" class="sections-container">
      <div
        v-for="(section, index) in orderedSections"
        :key="section.id"
        class="section-item"
        :class="{ disabled: !section.is_enabled }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover.prevent="handleDragOver(index)"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle -->
        <div class="drag-handle" title="Drag to reorder">
          ⋮⋮
        </div>

        <!-- Section Content -->
        <div class="section-content">
          <!-- Section Header -->
          <div class="section-header">
            <div class="section-info">
              <span class="section-name">{{ section.name }}</span>
              <span class="section-type" :class="`type-${section.type}`">
                {{ section.type }}
              </span>
            </div>
            <div class="section-actions">
              <label class="toggle-container" title="Enable/Disable section">
                <input
                  type="checkbox"
                  :checked="section.is_enabled"
                  @change="handleToggle(section)"
                  class="toggle-checkbox"
                />
                <span class="toggle-label">
                  {{ section.is_enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </label>
              <button
                @click="$emit('edit-section', section)"
                class="btn-action"
                title="Edit section"
              >
                ✎
              </button>
              <button
                @click="$emit('delete-section', section.id)"
                class="btn-action btn-delete"
                title="Delete section"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Section Preview (for prose sections) -->
          <div v-if="section.type === 'prose' && section.content" class="section-preview">
            {{ truncateContent(section.content) }}
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="orderedSections.length === 0" class="empty-state">
        No report sections configured. Create one to get started.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ReportSection } from '../composables/useReports';

// Props
interface Props {
  sections: ReportSection[];
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

// Emits
const emit = defineEmits<{
  'create-section': [];
  'edit-section': [section: ReportSection];
  'delete-section': [sectionId: number];
  'toggle-section': [section: ReportSection];
  'reorder-sections': [sectionIds: number[]];
}>();

// Drag and drop state
const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Computed
const orderedSections = computed(() => {
  return [...props.sections].sort((a, b) => a.order - b.order);
});

// Methods
const handleToggle = (section: ReportSection) => {
  emit('toggle-section', section);
};

const truncateContent = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
};

// Drag and drop handlers
const handleDragStart = (index: number) => {
  draggedIndex.value = index;
};

const handleDragOver = (index: number) => {
  dragOverIndex.value = index;
};

const handleDrop = (dropIndex: number) => {
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    return;
  }

  const sections = [...orderedSections.value];
  const draggedSection = sections[draggedIndex.value];
  
  // Remove dragged section
  sections.splice(draggedIndex.value, 1);
  
  // Insert at new position
  sections.splice(dropIndex, 0, draggedSection);
  
  // Emit reorder event with new section IDs order
  const sectionIds = sections.map(s => s.id);
  emit('reorder-sections', sectionIds);
  
  // Reset drag state
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
};
</script>

<style scoped>
.report-section-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.btn-create {
  padding: 0.5rem 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-create:hover {
  background-color: #1557b0;
}

.loading,
.error {
  padding: 1rem;
  text-align: center;
  color: #5f6368;
}

.error {
  color: #c00;
  background-color: #fee;
  border-radius: 4px;
}

.sections-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;
}

.section-item:hover {
  background-color: #e8f0fe;
  border-color: #1a73e8;
}

.section-item.disabled {
  opacity: 0.6;
  background-color: #f1f3f4;
}

.drag-handle {
  display: flex;
  align-items: center;
  color: #5f6368;
  font-size: 1.25rem;
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.section-name {
  font-size: 1rem;
  font-weight: 500;
  color: #202124;
}

.section-type {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.type-prose {
  background-color: #e8f0fe;
  color: #1a73e8;
}

.type-status {
  background-color: #e6f4ea;
  color: #137333;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.toggle-label {
  font-size: 0.75rem;
  color: #5f6368;
  font-weight: 500;
}

.btn-action {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 1rem;
  color: #5f6368;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.btn-action:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-delete:hover {
  background-color: #fee;
  color: #c00;
}

.section-preview {
  font-size: 0.875rem;
  color: #5f6368;
  padding: 0.5rem;
  background-color: white;
  border-radius: 3px;
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #5f6368;
  font-style: italic;
}
</style>
