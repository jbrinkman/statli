<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ProjectView from './views/ProjectView.vue';
import TaskView from './views/TaskView.vue';
import ReportView from './views/ReportView.vue';
import NotificationContainer from './components/NotificationContainer.vue';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp.vue';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import type { Project } from './composables/useProjects';

// Navigation state
type View = 'projects' | 'tasks' | 'report';
const currentView = ref<View>('projects');
const selectedProject = ref<Project | null>(null);

// Keyboard shortcuts help dialog
const showShortcutsHelp = ref(false);

// Navigation handlers
const handleNavigateToTasks = (project: Project) => {
  selectedProject.value = project;
  currentView.value = 'tasks';
};

const handleNavigateToReport = (project: Project) => {
  selectedProject.value = project;
  currentView.value = 'report';
};

const handleNavigateToProjects = () => {
  currentView.value = 'projects';
  selectedProject.value = null;
};

// Global keyboard shortcuts
useKeyboardShortcuts([
  {
    key: 'h',
    ctrl: true,
    handler: () => handleNavigateToProjects(),
    description: 'Go to home/projects view',
  },
  {
    key: 'Escape',
    handler: () => {
      if (showShortcutsHelp.value) {
        showShortcutsHelp.value = false;
      } else if (currentView.value !== 'projects') {
        handleNavigateToProjects();
      }
    },
    description: 'Go back to projects or close dialog',
  },
  {
    key: '?',
    handler: () => {
      showShortcutsHelp.value = !showShortcutsHelp.value;
    },
    description: 'Show keyboard shortcuts help',
  },
]);
</script>

<template>
  <div class="app-container" role="application" aria-label="Status Report Manager">
    <!-- Skip to main content link for screen readers -->
    <a href="#main-content" class="skip-to-main">Skip to main content</a>

    <!-- Notification Container -->
    <NotificationContainer />

    <!-- Keyboard Shortcuts Help Dialog -->
    <KeyboardShortcutsHelp v-model="showShortcutsHelp" />

    <!-- Navigation Bar -->
    <nav class="nav-bar" role="navigation" aria-label="Main navigation">
      <div class="nav-content">
        <h1 class="app-title">Status Report Manager</h1>
        <div class="nav-actions">
          <button
            @click="showShortcutsHelp = true"
            class="btn-help"
            aria-label="Show keyboard shortcuts (Press ?)"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <div class="nav-breadcrumb" role="navigation" aria-label="Breadcrumb">
            <button 
              v-if="currentView !== 'projects'"
              @click="handleNavigateToProjects"
              class="breadcrumb-link"
              aria-label="Navigate to projects"
            >
              Projects
            </button>
            <span v-if="selectedProject && currentView !== 'projects'" class="breadcrumb-separator" aria-hidden="true">/</span>
            <span v-if="selectedProject && currentView !== 'projects'" class="breadcrumb-current" aria-current="page">
              {{ selectedProject.name }}
            </span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main id="main-content" class="main-content" role="main">
      <ProjectView 
        v-if="currentView === 'projects'"
        @navigate-to-tasks="handleNavigateToTasks"
        data-view="projects"
      />
      <TaskView 
        v-else-if="currentView === 'tasks' && selectedProject"
        :project="selectedProject"
        @navigate-to-report="handleNavigateToReport"
        @navigate-to-projects="handleNavigateToProjects"
        data-view="tasks"
      />
      <ReportView 
        v-else-if="currentView === 'report' && selectedProject"
        :project="selectedProject"
        @navigate-to-tasks="() => handleNavigateToTasks(selectedProject!)"
        data-view="report"
      />
    </main>
  </div>
</template>

<style>
/* Global styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Focus styles for keyboard navigation */
*:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}

/* Skip to main content link for screen readers */
.skip-to-main {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 1rem;
  background-color: #1a73e8;
  color: white;
  text-decoration: none;
}

.skip-to-main:focus {
  left: 0;
  top: 0;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f9fafb;
}

.nav-bar {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;
  flex-shrink: 0;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1280px;
  margin: 0 auto;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-help {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-help:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
  color: #111827;
}

.nav-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.breadcrumb-link:hover {
  background-color: #e8f0fe;
}

.breadcrumb-separator {
  color: #9ca3af;
}

.breadcrumb-current {
  color: #4b5563;
  font-weight: 500;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .nav-bar {
    padding: 0.75rem 1rem;
  }

  .app-title {
    font-size: 1rem;
  }

  .nav-breadcrumb {
    font-size: 0.75rem;
  }
}
</style>
