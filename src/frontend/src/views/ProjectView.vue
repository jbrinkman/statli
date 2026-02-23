<template>
  <div class="project-view" :data-view-state="showForm ? 'form' : 'list'">
    <!-- Show ProjectForm when creating/editing -->
    <div v-if="showForm" class="form-container">
      <ProjectForm :project="editingProject" @submit="handleProjectSubmit" @cancel="handleFormCancel"
        data-component="project-form" />
    </div>

    <!-- Show ProjectList when not creating/editing -->
    <div v-else class="list-container">
      <ProjectList :active-projects="activeProjects" :archived-projects="archivedProjects" :loading="loading"
        :error="error" :selected-project-id="selectedProjectId" @create="handleCreateProject"
        @select="handleSelectProject" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ProjectList from '../components/ProjectList.vue';
import ProjectForm from '../components/ProjectForm.vue';
import { useProjects, type Project } from '../composables/useProjects';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

// Emits for navigation
const emit = defineEmits<{
  navigateToTasks: [project: Project];
}>();

// Use projects composable
const {
  activeProjects,
  archivedProjects,
  loading,
  error,
  createProject,
  updateProject,
  loadActiveProjects,
  loadArchivedProjects,
} = useProjects();

// Local state
const showForm = ref(false);
const editingProject = ref<Project | null>(null);
const selectedProjectId = ref<number | null>(null);

// Load projects on mount
onMounted(async () => {
  await loadActiveProjects();
  await loadArchivedProjects();
});

// Handle create project button click
const handleCreateProject = () => {
  editingProject.value = null;
  showForm.value = true;
};

// Handle project selection
const handleSelectProject = (project: Project) => {
  selectedProjectId.value = project.id;
  // Navigate to TaskView with selected project
  emit('navigateToTasks', project);
};

// Handle project form submission
const handleProjectSubmit = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'> | Project) => {
  try {
    if ('id' in projectData) {
      // Update existing project
      await updateProject(projectData as Project);
    } else {
      // Create new project
      await createProject(projectData);
    }
    // Close form and refresh list
    showForm.value = false;
    editingProject.value = null;
  } catch (err) {
    // Error is handled by the composable
    console.error('Failed to save project:', err);
  }
};

// Handle form cancel
const handleFormCancel = () => {
  showForm.value = false;
  editingProject.value = null;
};

// Keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'n',
    ctrl: true,
    handler: () => {
      if (!showForm.value) {
        handleCreateProject();
      }
    },
    description: 'Create new project',
  },
  {
    key: 'Escape',
    handler: () => {
      if (showForm.value) {
        handleFormCancel();
      }
    },
    description: 'Cancel form',
  },
]);
</script>

<style scoped>
.project-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f9fafb;
}

.form-container,
.list-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
