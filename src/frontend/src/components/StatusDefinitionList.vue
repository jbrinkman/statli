<template>
  <div class="status-definition-list">
    <!-- Header -->
    <div class="header">
      <h2 class="title">Status Definitions</h2>
      <button @click="$emit('create-status')" class="btn-create">
        Create Status
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading status definitions...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- Status List -->
    <div v-if="!loading && !error" class="status-container">
      <div
        v-for="status in orderedStatuses"
        :key="status.id"
        class="status-item"
      >
        <!-- Status Content -->
        <div class="status-content">
          <!-- Status Info -->
          <div class="status-info">
            <span class="status-name">{{ status.name }}</span>
            <span class="status-badge" :class="`status-${status.style}`">
              {{ status.style }}
            </span>
          </div>

          <!-- Status Actions -->
          <div class="status-actions">
            <button
              @click="$emit('edit-status', status)"
              class="btn-action"
              title="Edit status"
            >
              ✎
            </button>
            <button
              @click="$emit('delete-status', status.id)"
              class="btn-action btn-delete"
              title="Delete status"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="orderedStatuses.length === 0" class="empty-state">
        No status definitions configured. Create one to get started.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StatusDefinition } from '../composables/useReports';

// Props
interface Props {
  statuses: StatusDefinition[];
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

// Emits
const emit = defineEmits<{
  'create-status': [];
  'edit-status': [status: StatusDefinition];
  'delete-status': [statusId: number];
}>();

// Computed
const orderedStatuses = computed(() => {
  return [...props.statuses].sort((a, b) => a.order - b.order);
});
</script>

<style scoped>
.status-definition-list {
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

.status-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-item {
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  transition: all 0.2s;
}

.status-item:hover {
  background-color: #e8f0fe;
  border-color: #1a73e8;
}

.status-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.status-name {
  font-size: 1rem;
  font-weight: 500;
  color: #202124;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-red {
  background-color: #fee;
  color: #c00;
}

.status-green {
  background-color: #efe;
  color: #0a0;
}

.status-yellow {
  background-color: #ffe;
  color: #aa0;
}

.status-gray {
  background-color: #eee;
  color: #666;
}

.status-paused {
  background-color: #fef;
  color: #90a;
}

.status-pending {
  background-color: #eff;
  color: #099;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #5f6368;
  font-style: italic;
}
</style>
