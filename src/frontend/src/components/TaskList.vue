<template>
  <div class="task-list">
    <!-- Header -->
    <div class="header">
      <h2 class="title">Tasks</h2>
      <button @click="$emit('create-task')" class="btn-create">
        Create Task
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading tasks...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <!-- Tasks organized by sections -->
    <div v-if="!loading && !error" class="sections-container">
      <div
        v-for="section in statusSections"
        :key="section.id"
        class="section"
      >
        <h3 class="section-title">{{ section.name }}</h3>
        
        <!-- Tasks in this section -->
        <div class="tasks-container">
          <div
            v-for="task in getTasksForSection(section.id)"
            :key="task.id"
            class="task-item"
            :class="{ selected: selectedTaskId === task.id }"
            @click="handleTaskSelect(task)"
          >
            <!-- Task Header -->
            <div class="task-header">
              <div class="task-name">
                <a
                  v-if="task.url"
                  :href="task.url"
                  target="_blank"
                  class="task-link"
                  @click.stop
                >
                  {{ task.name }}
                </a>
                <span v-else>{{ task.name }}</span>
              </div>
              <div class="task-actions">
                <button
                  @click.stop="$emit('edit-task', task)"
                  class="btn-action"
                  title="Edit task"
                >
                  ✎
                </button>
                <button
                  @click.stop="$emit('delete-task', task.id)"
                  class="btn-action btn-delete"
                  title="Delete task"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- Task Details -->
            <div class="task-details">
              <span class="task-status" :class="`status-${getStatusStyle(task.status)}`">
                {{ task.status }}
              </span>
              <span v-if="task.expected_completion_date" class="task-ecd">
                ECD: {{ formatDate(task.expected_completion_date) }}
              </span>
            </div>

            <!-- Task Notes -->
            <div v-if="task.notes" class="task-notes">
              {{ task.notes }}
            </div>

            <!-- Subtasks -->
            <div v-if="getSubtasksForTask(task.id).length > 0" class="subtasks-container">
              <div
                v-for="subtask in getSubtasksForTask(task.id)"
                :key="subtask.id"
                class="subtask-item"
                @click.stop="handleSubtaskSelect(subtask)"
              >
                <!-- Subtask Header -->
                <div class="subtask-header">
                  <div class="subtask-name">
                    <a
                      v-if="subtask.url"
                      :href="subtask.url"
                      target="_blank"
                      class="subtask-link"
                      @click.stop
                    >
                      {{ subtask.name }}
                    </a>
                    <span v-else>{{ subtask.name }}</span>
                  </div>
                  <div class="subtask-actions">
                    <button
                      @click.stop="$emit('edit-subtask', subtask)"
                      class="btn-action"
                      title="Edit subtask"
                    >
                      ✎
                    </button>
                    <button
                      @click.stop="$emit('delete-subtask', subtask.id)"
                      class="btn-action btn-delete"
                      title="Delete subtask"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <!-- Subtask Details -->
                <div class="subtask-details">
                  <span class="subtask-status" :class="`status-${getStatusStyle(subtask.status)}`">
                    {{ subtask.status }}
                  </span>
                  <span v-if="subtask.expected_completion_date" class="subtask-ecd">
                    ECD: {{ formatDate(subtask.expected_completion_date) }}
                  </span>
                </div>

                <!-- Subtask Notes -->
                <div v-if="subtask.notes" class="subtask-notes">
                  {{ subtask.notes }}
                </div>
              </div>

              <!-- Add Subtask Button -->
              <button
                @click.stop="$emit('create-subtask', task)"
                class="btn-add-subtask"
              >
                + Add Subtask
              </button>
            </div>

            <!-- Add Subtask Button (when no subtasks exist) -->
            <button
              v-else
              @click.stop="$emit('create-subtask', task)"
              class="btn-add-subtask"
            >
              + Add Subtask
            </button>
          </div>

          <!-- Empty state for section -->
          <div v-if="getTasksForSection(section.id).length === 0" class="empty-section">
            No tasks in this section. Create one to get started.
          </div>
        </div>
      </div>

      <!-- Empty state when no sections -->
      <div v-if="statusSections.length === 0" class="empty-state">
        No status sections configured. Please configure report sections for this project.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Task, Subtask } from '../composables/useTasks';
import type { ReportSection, StatusDefinition } from '../composables/useReports';

// Props
interface Props {
  tasks: Task[];
  subtasks: Subtask[];
  sections: ReportSection[];
  statusDefinitions: StatusDefinition[];
  loading?: boolean;
  error?: string | null;
  selectedTaskId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  selectedTaskId: null,
});

// Emits
const emit = defineEmits<{
  'create-task': [];
  'edit-task': [task: Task];
  'delete-task': [taskId: number];
  'create-subtask': [task: Task];
  'edit-subtask': [subtask: Subtask];
  'delete-subtask': [subtaskId: number];
  'select-task': [task: Task];
  'select-subtask': [subtask: Subtask];
}>();

// Computed
const statusSections = computed(() => {
  return props.sections
    .filter(section => section.type === 'status')
    .sort((a, b) => a.order - b.order);
});

// Methods
const getTasksForSection = (sectionId: number): Task[] => {
  return props.tasks
    .filter(task => task.report_section_id === sectionId && !task.is_deleted && !task.is_archived)
    .sort((a, b) => a.priority - b.priority);
};

const getSubtasksForTask = (taskId: number): Subtask[] => {
  return props.subtasks
    .filter(subtask => subtask.task_id === taskId && !subtask.is_deleted);
};

const getStatusStyle = (status: string): string => {
  const statusDef = props.statusDefinitions.find(
    def => def.name.toLowerCase() === status.toLowerCase()
  );
  return statusDef?.style || 'gray';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const handleTaskSelect = (task: Task) => {
  emit('select-task', task);
};

const handleSubtaskSelect = (subtask: Subtask) => {
  emit('select-subtask', subtask);
};
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  background-color: #ffffff;
}

@media (min-width: 768px) {
  .task-list {
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

.sections-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

@media (min-width: 768px) {
  .section-title {
    font-size: 1.125rem;
  }
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  background-color: #e8f0fe;
  border-color: #1a73e8;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.task-item.selected {
  background-color: #e8f0fe;
  border-color: #1a73e8;
  border-width: 2px;
  padding: calc(1rem - 1px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.task-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  flex: 1;
  word-break: break-word;
}

@media (min-width: 768px) {
  .task-name {
    font-size: 1rem;
  }
}

.task-link {
  color: #1a73e8;
  text-decoration: none;
}

.task-link:hover {
  text-decoration: underline;
}

.task-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-action {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  font-size: 1rem;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  color: #111827;
}

.btn-delete:hover {
  background-color: #fee;
  border-color: #fcc;
  color: #c00;
}

.task-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-status,
.subtask-status {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
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

.task-ecd,
.subtask-ecd {
  font-size: 0.75rem;
  color: #6b7280;
}

.task-notes {
  font-size: 0.875rem;
  color: #4b5563;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #ffffff;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  white-space: pre-wrap;
  word-break: break-word;
}

.subtasks-container {
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 3px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .subtasks-container {
    padding-left: 1.5rem;
  }
}

.subtask-item {
  padding: 0.75rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.subtask-item:hover {
  background-color: #f9fafb;
  border-color: #1a73e8;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.subtask-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.subtask-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #111827;
  flex: 1;
  word-break: break-word;
}

@media (min-width: 768px) {
  .subtask-name {
    font-size: 0.875rem;
  }
}

.subtask-link {
  color: #1a73e8;
  text-decoration: none;
}

.subtask-link:hover {
  text-decoration: underline;
}

.subtask-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.subtask-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.subtask-notes {
  font-size: 0.75rem;
  color: #4b5563;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.25rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.btn-add-subtask {
  padding: 0.5rem;
  background-color: transparent;
  color: #1a73e8;
  border: 1px dashed #1a73e8;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.btn-add-subtask:hover {
  background-color: #e8f0fe;
  border-style: solid;
}

.btn-add-subtask:active {
  transform: scale(0.98);
}

.empty-section {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  background-color: #f9fafb;
  border-radius: 0.375rem;
  border: 1px dashed #d1d5db;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}
</style>
