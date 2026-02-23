<template>
  <div class="task-view" role="region" aria-label="Project management view">
    <!-- Header with project info and actions -->
    <div class="header">
      <div class="header-left">
        <button @click="$emit('navigate-to-projects')" class="btn-back" aria-label="Navigate back to projects">
          ← Back to Projects
        </button>
        <h1 class="project-name">{{ project?.name || 'Loading...' }}</h1>
      </div>
      <div class="header-right">
        <button @click="showConfigDialog = true" class="btn-config" aria-label="Configure project settings">
          ⚙ Configure Project
        </button>
        <button @click="handleGenerateReport" class="btn-generate" aria-label="Generate status report (Ctrl+G)">
          📄 Generate Report
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading" role="status" aria-live="polite">
      Loading project data...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error" role="alert" aria-live="assertive">
      {{ error }}
    </div>

    <!-- Main Content -->
    <div v-if="!loading && !error" class="content">
      <!-- Show TaskForm when creating/editing task -->
      <div v-if="showTaskForm" class="form-overlay" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div class="form-container">
          <TaskForm :task="editingTask" :section-id="currentSectionId!" :status-definitions="statusDefinitions"
            :project-id="project!.id" @submit="handleTaskSubmit" @cancel="handleTaskFormCancel" />
        </div>
      </div>

      <!-- Show SubtaskForm when creating/editing subtask -->
      <div v-if="showSubtaskForm" class="form-overlay" role="dialog" aria-modal="true"
        aria-labelledby="subtask-form-title">
        <div class="form-container">
          <SubtaskForm :subtask="editingSubtask" :task-id="selectedTask!.id" :status-definitions="statusDefinitions"
            @submit="handleSubtaskSubmit" @cancel="handleSubtaskFormCancel" />
        </div>
      </div>

      <!-- Show ProjectForm when configuring project -->
      <div v-if="showConfigDialog" class="form-overlay" role="dialog" aria-modal="true"
        aria-labelledby="project-config-title">
        <div class="form-container">
          <ProjectForm :project="project!" @submit="handleProjectUpdate" @cancel="showConfigDialog = false" />
        </div>
      </div>

      <!-- Show SectionForm when creating/editing section -->
      <div v-if="showSectionForm" class="form-overlay" role="dialog" aria-modal="true"
        aria-labelledby="section-form-title">
        <div class="form-container section-form-dialog">
          <div class="form-header">
            <h2 id="section-form-title">{{ editingSection ? 'Edit Section' : 'Create Section' }}</h2>
            <button @click="handleSectionFormCancel" class="btn-close">×</button>
          </div>
          <form @submit.prevent="handleSectionFormSubmit" class="simple-form">
            <div class="form-group">
              <label for="section-name">Section Name *</label>
              <input id="section-name" v-model="sectionFormData.name" type="text" required class="form-input"
                placeholder="e.g., Completed Tasks" />
            </div>
            <div class="form-group">
              <label for="section-type">Section Type *</label>
              <select id="section-type" v-model="sectionFormData.type" required class="form-input">
                <option value="status">Status (Task List)</option>
                <option value="prose">Prose (Free Text)</option>
              </select>
            </div>
            <div v-if="sectionFormData.type === 'prose'" class="form-group">
              <label for="section-content">Content</label>
              <textarea id="section-content" v-model="sectionFormData.content" class="form-textarea" rows="4"
                placeholder="Enter section content..."></textarea>
            </div>
            <div class="form-actions">
              <button type="button" @click="handleSectionFormCancel" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">{{ editingSection ? 'Update' : 'Create' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ProseEditorModal for editing prose sections -->
      <ProseEditorModal v-if="editingProseSection" :section="editingProseSection" :is-open="showProseEditor"
        @save="handleProseSave" @cancel="handleProseCancel" />

      <!-- Section-Centric View -->
      <div class="sections-view">
        <!-- Sections Header -->
        <div class="sections-header">
          <h2 class="sections-title">Report Sections</h2>
          <button @click="handleCreateSection" class="btn-create-section">
            + Create Section
          </button>
        </div>

        <!-- Sections List -->
        <div class="sections-list">
          <div v-for="section in orderedSections" :key="section.id" class="section-card"
            :class="{ disabled: !section.is_enabled }">
            <!-- Section Header -->
            <div class="section-header">
              <div class="section-info">
                <span class="section-name">{{ section.name }}</span>
                <span class="section-type" :class="`type-${section.type}`">
                  {{ section.type }}
                </span>
                <label class="toggle-container">
                  <input type="checkbox" :checked="section.is_enabled" @change="handleToggleSection(section)"
                    class="toggle-checkbox" />
                  <span class="toggle-label">
                    {{ section.is_enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </label>
              </div>
              <div class="section-actions">
                <button @click="handleEditSection(section)" class="btn-action" title="Edit section">
                  ✎ Edit
                </button>
                <button @click="handleDeleteSection(section.id)" class="btn-action btn-delete" title="Delete section">
                  × Delete
                </button>
              </div>
            </div>

            <!-- Prose Section Content -->
            <div v-if="section.type === 'prose'" class="prose-content">
              <div class="prose-preview">
                {{ truncateContent(section.content || 'No content') }}
              </div>
              <button @click="handleEditProseSection(section)" class="btn-edit-prose">
                ✎ Edit Content
              </button>
            </div>

            <!-- Status Section Tasks -->
            <div v-if="section.type === 'status'" class="tasks-container">
              <div class="tasks-header">
                <span class="tasks-count">
                  {{ getSectionTasks(section.id).length }} task(s)
                </span>
                <button @click="handleCreateTaskForSection(section.id)" class="btn-add-task">
                  + Add Task
                </button>
              </div>

              <!-- Tasks List -->
              <div v-if="getSectionTasks(section.id).length > 0" class="tasks-list">
                <div v-for="task in getSectionTasks(section.id)" :key="task.id" class="task-item"
                  :class="{ deleted: task.is_deleted }">
                  <div class="task-header">
                    <span class="task-name">{{ task.name }}</span>
                    <div class="task-actions">
                      <button @click="handleEditTask(task, section.id)" class="btn-task-action" title="Edit task">
                        ✎
                      </button>
                      <button @click="handleDeleteTask(task.id)" class="btn-task-action btn-delete" title="Delete task">
                        ×
                      </button>
                    </div>
                  </div>
                  <div class="task-details">
                    <span class="task-status">{{ getStatusName(task.status) }}</span>
                    <span class="task-subtasks">
                      {{ getTaskSubtasks(task.id).length }} subtask(s)
                    </span>
                    <button @click="handleCreateSubtask(task)" class="btn-add-subtask">
                      + Add Subtask
                    </button>
                  </div>

                  <!-- Subtasks -->
                  <div v-if="getTaskSubtasks(task.id).length > 0" class="subtasks-list">
                    <div v-for="subtask in getTaskSubtasks(task.id)" :key="subtask.id" class="subtask-item"
                      :class="{ deleted: subtask.is_deleted }">
                      <span class="subtask-name">{{ subtask.name }}</span>
                      <span class="subtask-status">{{ getStatusName(subtask.status) }}</span>
                      <div class="subtask-actions">
                        <button @click="handleEditSubtask(subtask, task)" class="btn-subtask-action"
                          title="Edit subtask">
                          ✎
                        </button>
                        <button @click="handleDeleteSubtask(subtask.id)" class="btn-subtask-action btn-delete"
                          title="Delete subtask">
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="tasks-empty">
                No tasks yet. Click "Add Task" to create one.
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="orderedSections.length === 0" class="sections-empty">
            No report sections configured. Create one to get started.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import TaskForm from '../components/TaskForm.vue';
import SubtaskForm from '../components/SubtaskForm.vue';
import ProjectForm from '../components/ProjectForm.vue';
import ProseEditorModal from '../components/ProseEditorModal.vue';
import { useTasks, type Task, type Subtask } from '../composables/useTasks';
import { useReports, type ReportSection } from '../composables/useReports';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import type { Project } from '../composables/useProjects';

// Props
interface Props {
  project: Project;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'navigate-to-projects': [];
  'navigate-to-report': [project: Project];
  'navigate-to-section-editor': [sectionId: number];
  'project-updated': [project: Project];
}>();

// Use composables
const {
  tasks,
  subtasks,
  loading: tasksLoading,
  error: tasksError,
  createTask,
  updateTask,
  softDeleteTask,
  createSubtask,
  updateSubtask,
  softDeleteSubtask,
} = useTasks();

const {
  reportSections,
  statusDefinitions,
  loading: reportsLoading,
  error: reportsError,
  loadReportSections,
  loadStatusDefinitions,
  updateReportSection,
  reorderSections,
} = useReports();

// Local state
const loading = ref(true);
const error = ref<string | null>(null);
const showTaskForm = ref(false);
const showSubtaskForm = ref(false);
const showConfigDialog = ref(false);
const showSectionForm = ref(false);
const showProseEditor = ref(false);
const editingTask = ref<Task | null>(null);
const editingSubtask = ref<Subtask | null>(null);
const editingSection = ref<ReportSection | null>(null);
const editingProseSection = ref<ReportSection | null>(null);
const selectedTask = ref<Task | null>(null);
const currentSectionId = ref<number | null>(null);
const allTasks = ref<Task[]>([]);
const allSubtasks = ref<Subtask[]>([]);

// Section form data
const sectionFormData = ref({
  name: '',
  type: 'status' as 'prose' | 'status',
  content: '',
});

// Computed
const project = computed(() => props.project);

const orderedSections = computed(() => {
  return [...reportSections.value].sort((a, b) => a.order - b.order);
});

// Helper methods
const getSectionTasks = (sectionId: number): Task[] => {
  return allTasks.value.filter(task => task.report_section_id === sectionId && !task.is_deleted);
};

const getTaskSubtasks = (taskId: number): Subtask[] => {
  return allSubtasks.value.filter(subtask => subtask.task_id === taskId && !subtask.is_deleted);
};

const getStatusName = (status: string): string => {
  return status;
};

const truncateContent = (content: string, maxLength: number = 150): string => {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
};

// Load project data on mount
onMounted(async () => {
  await loadProjectData();
});

// Load all project data
const loadProjectData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Load report sections and status definitions
    await Promise.all([
      loadReportSections(props.project.id),
      loadStatusDefinitions(props.project.id),
    ]);

    // Load tasks for all status sections
    await loadAllTasks();
  } catch (err: any) {
    error.value = err.message || 'Failed to load project data';
  } finally {
    loading.value = false;
  }
};

// Load all tasks for all status sections
const loadAllTasks = async () => {
  try {
    // Get all status sections
    const statusSections = reportSections.value.filter(
      section => section.type === 'status'
    );

    // Load tasks for each section
    const taskPromises = statusSections.map(async (section) => {
      // Call backend to get tasks for this section
      const app = (window as any).go?.main?.App;
      if (app && typeof app.ListTasksBySection === 'function') {
        const sectionTasks = await app.ListTasksBySection(section.id);
        return sectionTasks || [];
      }
      return [];
    });

    const taskArrays = await Promise.all(taskPromises);
    allTasks.value = taskArrays.flat();

    // Load subtasks for all tasks
    const subtaskPromises = allTasks.value.map(async (task) => {
      const app = (window as any).go?.main?.App;
      if (app && typeof app.ListSubtasksByTask === 'function') {
        const taskSubtasks = await app.ListSubtasksByTask(task.id);
        return taskSubtasks || [];
      }
      return [];
    });

    const subtaskArrays = await Promise.all(subtaskPromises);
    allSubtasks.value = subtaskArrays.flat();
  } catch (err: any) {
    console.error('Failed to load tasks:', err);
    throw err;
  }
};

// Section handlers
const handleCreateSection = () => {
  sectionFormData.value = {
    name: '',
    type: 'status',
    content: '',
  };
  editingSection.value = null;
  showSectionForm.value = true;
};

const handleEditSection = (section: ReportSection) => {
  sectionFormData.value = {
    name: section.name,
    type: section.type as 'prose' | 'status',
    content: section.content,
  };
  editingSection.value = section;
  showSectionForm.value = true;
};

const handleSectionFormSubmit = async () => {
  if (!sectionFormData.value.name.trim()) {
    alert('Section name is required');
    return;
  }

  try {
    const app = (window as any).go?.main?.App;
    if (!app) {
      throw new Error('App not available');
    }

    if (editingSection.value) {
      // Update existing section
      await app.UpdateReportSection({
        ...editingSection.value,
        name: sectionFormData.value.name.trim(),
        type: sectionFormData.value.type,
        content: sectionFormData.value.content.trim(),
      });
    } else {
      // Create new section
      const maxOrder = reportSections.value.length > 0
        ? Math.max(...reportSections.value.map(s => s.order))
        : 0;

      await app.CreateReportSection({
        project_id: props.project.id,
        name: sectionFormData.value.name.trim(),
        type: sectionFormData.value.type,
        content: sectionFormData.value.content.trim(),
        order: maxOrder + 1,
        is_enabled: true,
      });
    }

    showSectionForm.value = false;
    editingSection.value = null;
    await loadReportSections(props.project.id);
  } catch (err: any) {
    console.error('Failed to save section:', err);
    alert(`Failed to save section: ${err.message || 'Unknown error'}`);
  }
};

const handleSectionFormCancel = () => {
  showSectionForm.value = false;
  editingSection.value = null;
};

const handleDeleteSection = async (sectionId: number) => {
  if (!confirm('Are you sure you want to delete this section? All tasks in this section will also be deleted.')) {
    return;
  }

  try {
    // TODO: Implement section deletion via backend API
    alert('Section deletion not yet implemented. Please use the Report View to manage sections.');
  } catch (err: any) {
    console.error('Failed to delete section:', err);
  }
};

const handleToggleSection = async (section: ReportSection) => {
  try {
    await updateReportSection({
      ...section,
      is_enabled: !section.is_enabled,
    });
    await loadReportSections(props.project.id);
  } catch (err: any) {
    console.error('Failed to toggle section:', err);
  }
};

// Prose editor handlers
const handleEditProseSection = (section: ReportSection) => {
  // New behavior: navigate to section editor view
  emit('navigate-to-section-editor', section.id);

  // Old behavior kept for backward compatibility with tests
  // This can be removed once all tests are updated
  editingProseSection.value = section;
  showProseEditor.value = true;
};

const handleProseSave = async (content: string) => {
  if (!editingProseSection.value) return;

  try {
    await updateReportSection({
      ...editingProseSection.value,
      content: content,
    });

    showProseEditor.value = false;
    editingProseSection.value = null;

    // Refresh section list to show updated content
    await loadReportSections(props.project.id);
  } catch (err: any) {
    console.error('Failed to save prose section:', err);
    alert(`Failed to save section: ${err.message || 'Unknown error'}`);
  }
};

const handleProseCancel = () => {
  showProseEditor.value = false;
  editingProseSection.value = null;
};

// Task handlers
const handleCreateTaskForSection = (sectionId: number) => {
  currentSectionId.value = sectionId;
  editingTask.value = null;
  showTaskForm.value = true;
};

const handleEditTask = (task: Task, sectionId: number) => {
  currentSectionId.value = sectionId;
  editingTask.value = task;
  showTaskForm.value = true;
};

const handleDeleteTask = async (taskId: number) => {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }

  try {
    await softDeleteTask(taskId);
    // Reload tasks
    await loadAllTasks();
  } catch (err: any) {
    console.error('Failed to delete task:', err);
  }
};

const handleTaskSubmit = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'> | Task) => {
  try {
    if ('id' in taskData) {
      // Update existing task
      await updateTask(taskData as Task);
    } else {
      // Create new task
      await createTask(taskData);
    }
    // Close form and reload tasks
    showTaskForm.value = false;
    editingTask.value = null;
    await loadAllTasks();
  } catch (err: any) {
    console.error('Failed to save task:', err);
  }
};

const handleTaskFormCancel = () => {
  showTaskForm.value = false;
  editingTask.value = null;
};

const handleSelectTask = (task: Task) => {
  selectedTask.value = task;
};

// Subtask handlers
const handleCreateSubtask = (task: Task) => {
  selectedTask.value = task;
  editingSubtask.value = null;
  showSubtaskForm.value = true;
};

const handleEditSubtask = (subtask: Subtask, task: Task) => {
  selectedTask.value = task;
  editingSubtask.value = subtask;
  showSubtaskForm.value = true;
};

const handleDeleteSubtask = async (subtaskId: number) => {
  if (!confirm('Are you sure you want to delete this subtask?')) {
    return;
  }

  try {
    await softDeleteSubtask(subtaskId);
    // Reload tasks
    await loadAllTasks();
  } catch (err: any) {
    console.error('Failed to delete subtask:', err);
  }
};

const handleSubtaskSubmit = async (subtaskData: Omit<Subtask, 'id' | 'created_at' | 'updated_at'> | Subtask) => {
  try {
    if ('id' in subtaskData) {
      // Update existing subtask
      await updateSubtask(subtaskData as Subtask);
    } else {
      // Create new subtask
      await createSubtask(subtaskData);
    }
    // Close form and reload tasks
    showSubtaskForm.value = false;
    editingSubtask.value = null;
    await loadAllTasks();
  } catch (err: any) {
    console.error('Failed to save subtask:', err);
  }
};

const handleSubtaskFormCancel = () => {
  showSubtaskForm.value = false;
  editingSubtask.value = null;
};

// Project configuration handler
const handleProjectUpdate = async (projectData: Project | Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    // Emit event to parent to update project (should always be a full Project when editing)
    if ('id' in projectData) {
      emit('project-updated', projectData as Project);
    }
    showConfigDialog.value = false;
  } catch (err: any) {
    console.error('Failed to update project:', err);
  }
};

// Generate report handler
const handleGenerateReport = () => {
  emit('navigate-to-report', props.project);
};

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'g',
    ctrl: true,
    handler: () => {
      if (!showTaskForm.value && !showSubtaskForm.value && !showConfigDialog.value) {
        handleGenerateReport();
      }
    },
    description: 'Generate report',
  },
  {
    key: 'Escape',
    handler: () => {
      if (showTaskForm.value) {
        handleTaskFormCancel();
      } else if (showSubtaskForm.value) {
        handleSubtaskFormCancel();
      } else if (showConfigDialog.value) {
        showConfigDialog.value = false;
      }
    },
    description: 'Close dialog',
  },
]);
</script>

<style scoped>
.task-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  background-color: #f8f9fa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-back {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.project-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 0.75rem;
}

.btn-config {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-config:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-generate {
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

.btn-generate:hover {
  background-color: #1557b0;
}

.loading,
.error {
  padding: 2rem;
  text-align: center;
  color: #5f6368;
}

.error {
  color: #c00;
  background-color: #fee;
  border-radius: 4px;
  margin: 1rem;
}

.content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.form-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 2rem;
}

.form-container {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.sections-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9fafb;
}

.sections-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #202124;
  margin: 0;
}

.btn-create-section {
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

.btn-create-section:hover {
  background-color: #1557b0;
}

.sections-list {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-card {
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.section-card.disabled {
  opacity: 0.6;
  background-color: #f1f3f4;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.section-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #202124;
}

.section-type {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
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

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.375rem 0.75rem;
  background-color: transparent;
  color: #5f6368;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-delete:hover {
  background-color: #fee;
  color: #c00;
  border-color: #fcc;
}

.prose-content {
  padding: 1rem;
  background-color: white;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prose-preview {
  font-size: 0.875rem;
  color: #5f6368;
  white-space: pre-wrap;
  line-height: 1.6;
}

.btn-edit-prose {
  padding: 0.5rem 1rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.btn-edit-prose:hover {
  background-color: #1557b0;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tasks-count {
  font-size: 0.875rem;
  color: #5f6368;
  font-weight: 500;
}

.btn-add-task {
  padding: 0.375rem 0.75rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-add-task:hover {
  background-color: #1557b0;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
}

.task-item.deleted {
  opacity: 0.5;
  text-decoration: line-through;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-name {
  font-size: 1rem;
  font-weight: 500;
  color: #202124;
}

.task-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-task-action {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 0.875rem;
  color: #5f6368;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.btn-task-action:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-task-action.btn-delete:hover {
  background-color: #fee;
  color: #c00;
}

.task-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #5f6368;
}

.task-status {
  padding: 0.25rem 0.5rem;
  background-color: #e8f0fe;
  color: #1a73e8;
  border-radius: 3px;
  font-weight: 500;
}

.task-subtasks {
  font-weight: 500;
}

.btn-add-subtask {
  padding: 0.25rem 0.5rem;
  background-color: transparent;
  color: #1a73e8;
  border: 1px solid #1a73e8;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-subtask:hover {
  background-color: #e8f0fe;
}

.subtasks-list {
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 3px;
}

.subtask-item.deleted {
  opacity: 0.5;
  text-decoration: line-through;
}

.subtask-name {
  flex: 1;
  font-size: 0.875rem;
  color: #202124;
}

.subtask-status {
  padding: 0.125rem 0.375rem;
  background-color: #e8f0fe;
  color: #1a73e8;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 500;
}

.subtask-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-subtask-action {
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 0.75rem;
  color: #5f6368;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.btn-subtask-action:hover {
  background-color: #e0e0e0;
  color: #202124;
}

.btn-subtask-action.btn-delete:hover {
  background-color: #fee;
  color: #c00;
}

.tasks-empty,
.sections-empty {
  padding: 2rem;
  text-align: center;
  color: #5f6368;
  font-style: italic;
  background-color: white;
  border-radius: 4px;
  border: 1px dashed #e0e0e0;
}

/* Section Form Styles */
.section-form-dialog {
  max-width: 500px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.form-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.btn-close {
  width: 2rem;
  height: 2rem;
  padding: 0;
  background-color: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.btn-close:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.simple-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #111827;
  background-color: #ffffff;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary,
.btn-primary {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.btn-primary {
  background-color: #1a73e8;
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: #1557b0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-primary:active,
.btn-secondary:active {
  transform: scale(0.98);
}
</style>
