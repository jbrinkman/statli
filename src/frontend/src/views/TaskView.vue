<template>
  <div class="task-view" role="region" aria-label="Task management view">
    <!-- Header with project info and actions -->
    <div class="header">
      <div class="header-left">
        <button 
          @click="$emit('navigate-back')" 
          class="btn-back"
          aria-label="Navigate back to projects"
        >
          ← Back to Projects
        </button>
        <h1 class="project-name">{{ project?.name || 'Loading...' }}</h1>
      </div>
      <div class="header-right">
        <button 
          @click="showConfigDialog = true" 
          class="btn-config"
          aria-label="Configure project settings"
        >
          ⚙ Configure Project
        </button>
        <button 
          @click="handleGenerateReport" 
          class="btn-generate"
          aria-label="Generate status report (Ctrl+G)"
        >
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
          <TaskForm
            :task="editingTask"
            :sections="reportSections"
            :status-definitions="statusDefinitions"
            :project-id="project!.id"
            @submit="handleTaskSubmit"
            @cancel="handleTaskFormCancel"
          />
        </div>
      </div>

      <!-- Show SubtaskForm when creating/editing subtask -->
      <div v-if="showSubtaskForm" class="form-overlay" role="dialog" aria-modal="true" aria-labelledby="subtask-form-title">
        <div class="form-container">
          <SubtaskForm
            :subtask="editingSubtask"
            :task="selectedTask!"
            :status-definitions="statusDefinitions"
            @submit="handleSubtaskSubmit"
            @cancel="handleSubtaskFormCancel"
          />
        </div>
      </div>

      <!-- Show ProjectForm when configuring project -->
      <div v-if="showConfigDialog" class="form-overlay" role="dialog" aria-modal="true" aria-labelledby="project-config-title">
        <div class="form-container">
          <ProjectForm
            :project="project!"
            @submit="handleProjectUpdate"
            @cancel="showConfigDialog = false"
          />
        </div>
      </div>

      <!-- Task List -->
      <TaskList
        :tasks="allTasks"
        :subtasks="allSubtasks"
        :sections="reportSections"
        :status-definitions="statusDefinitions"
        :loading="tasksLoading"
        :error="tasksError"
        :selected-task-id="selectedTask?.id || null"
        @create-task="handleCreateTask"
        @edit-task="handleEditTask"
        @delete-task="handleDeleteTask"
        @create-subtask="handleCreateSubtask"
        @edit-subtask="handleEditSubtask"
        @delete-subtask="handleDeleteSubtask"
        @select-task="handleSelectTask"
        @select-subtask="handleSelectSubtask"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import TaskList from '../components/TaskList.vue';
import TaskForm from '../components/TaskForm.vue';
import SubtaskForm from '../components/SubtaskForm.vue';
import ProjectForm from '../components/ProjectForm.vue';
import { useTasks, type Task, type Subtask } from '../composables/useTasks';
import { useReports } from '../composables/useReports';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import type { Project } from '../composables/useProjects';

// Props
interface Props {
  project: Project;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'navigate-back': [];
  'navigate-to-report': [project: Project];
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
} = useReports();

// Local state
const loading = ref(true);
const error = ref<string | null>(null);
const showTaskForm = ref(false);
const showSubtaskForm = ref(false);
const showConfigDialog = ref(false);
const editingTask = ref<Task | null>(null);
const editingSubtask = ref<Subtask | null>(null);
const selectedTask = ref<Task | null>(null);
const allTasks = ref<Task[]>([]);
const allSubtasks = ref<Subtask[]>([]);

// Computed
const project = computed(() => props.project);

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

// Task handlers
const handleCreateTask = () => {
  editingTask.value = null;
  showTaskForm.value = true;
};

const handleEditTask = (task: Task) => {
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

const handleEditSubtask = (subtask: Subtask) => {
  // Find the parent task
  const task = allTasks.value.find(t => t.id === subtask.task_id);
  if (task) {
    selectedTask.value = task;
  }
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

const handleSelectSubtask = (subtask: Subtask) => {
  // Could be used for future functionality
  console.log('Subtask selected:', subtask);
};

// Project configuration handler
const handleProjectUpdate = async (projectData: Project) => {
  try {
    // Emit event to parent to update project
    emit('project-updated', projectData);
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
    key: 'n',
    ctrl: true,
    handler: () => {
      if (!showTaskForm.value && !showSubtaskForm.value && !showConfigDialog.value) {
        handleCreateTask();
      }
    },
    description: 'Create new task',
  },
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
</style>
