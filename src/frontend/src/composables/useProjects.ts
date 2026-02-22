import { ref, Ref } from "vue";
import { useNotifications } from "./useNotifications";

// Project type matching the backend model
export interface Project {
  id: number;
  name: string;
  filename_format: string;
  report_title_format: string;
  default_directory: string;
  use_year_subfolders: boolean;
  recipients_to: string;
  recipients_cc: string;
  recipients_bcc: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// Composable state and methods
export function useProjects() {
  const { success, error: showError } = useNotifications();

  // Reactive state
  const projects: Ref<Project[]> = ref([]);
  const activeProjects: Ref<Project[]> = ref([]);
  const archivedProjects: Ref<Project[]> = ref([]);
  const currentProject: Ref<Project | null> = ref(null);
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  // Helper to call backend methods through window.go
  const callBackend = async (method: string, ...args: any[]): Promise<any> => {
    try {
      // Access the Wails runtime through window.go
      const app = (window as any).go?.main?.App;
      if (!app || typeof app[method] !== "function") {
        throw new Error(`Wails method ${method} not available`);
      }

      // Call the method directly on the App
      return await app[method](...args);
    } catch (err: any) {
      console.error(`Backend call failed: ${method}`, err);
      throw err;
    }
  };

  // Create a new project
  const createProject = async (
    project: Omit<Project, "id" | "created_at" | "updated_at">,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CreateProject", project);
      // Refresh the project list after creation
      await loadActiveProjects();
      success("Project created successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to create project";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing project
  const updateProject = async (project: Project): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("UpdateProject", project);
      // Refresh the project list after update
      await loadActiveProjects();
      // Update current project if it's the one being edited
      if (currentProject.value?.id === project.id) {
        currentProject.value = project;
      }
      success("Project updated successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to update project";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a project by ID
  const getProject = async (id: number): Promise<Project> => {
    loading.value = true;
    error.value = null;

    try {
      const project = await callBackend("GetProject", id);
      currentProject.value = project;
      return project;
    } catch (err: any) {
      error.value = err.message || "Failed to get project";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all active projects
  const loadActiveProjects = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListActiveProjects");
      activeProjects.value = result || [];
      projects.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load active projects";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all archived projects
  const loadArchivedProjects = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListArchivedProjects");
      archivedProjects.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load archived projects";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Archive a project
  const archiveProject = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("ArchiveProject", id);
      // Refresh both lists after archiving
      await loadActiveProjects();
      await loadArchivedProjects();
      // Clear current project if it was archived
      if (currentProject.value?.id === id) {
        currentProject.value = null;
      }
      success("Project archived successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to archive project";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Set the current project
  const setCurrentProject = (project: Project | null): void => {
    currentProject.value = project;
  };

  // Clear error
  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State
    projects,
    activeProjects,
    archivedProjects,
    currentProject,
    loading,
    error,

    // Methods
    createProject,
    updateProject,
    getProject,
    loadActiveProjects,
    loadArchivedProjects,
    archiveProject,
    setCurrentProject,
    clearError,
  };
}
