import { ref, Ref } from "vue";
import { useNotifications } from "./useNotifications";

// Task type matching the backend model
export interface Task {
  id: number;
  project_id: number;
  report_section_id: number;
  name: string;
  status: string;
  expected_completion_date: string | null;
  url: string;
  notes: string;
  priority: number;
  is_deleted: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// Subtask type matching the backend model
export interface Subtask {
  id: number;
  task_id: number;
  name: string;
  status: string;
  expected_completion_date: string | null;
  url: string;
  notes: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Composable state and methods
export function useTasks() {
  const { success, error: showError } = useNotifications();

  // Reactive state
  const tasks: Ref<Task[]> = ref([]);
  const subtasks: Ref<Subtask[]> = ref([]);
  const currentTask: Ref<Task | null> = ref(null);
  const currentSubtask: Ref<Subtask | null> = ref(null);
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

  // Task CRUD operations

  // Create a new task
  const createTask = async (
    task: Omit<Task, "id" | "created_at" | "updated_at">,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CreateTask", task);
      // Refresh the task list after creation if we have a section loaded
      if (task.report_section_id) {
        await loadTasksBySection(task.report_section_id);
      }
      success("Task created successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to create task";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing task
  const updateTask = async (task: Task): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("UpdateTask", task);
      // Refresh the task list after update
      if (task.report_section_id) {
        await loadTasksBySection(task.report_section_id);
      }
      // Update current task if it's the one being edited
      if (currentTask.value?.id === task.id) {
        currentTask.value = task;
      }
      success("Task updated successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to update task";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a task by ID
  const getTask = async (id: number): Promise<Task> => {
    loading.value = true;
    error.value = null;

    try {
      const task = await callBackend("GetTask", id);
      currentTask.value = task;
      return task;
    } catch (err: any) {
      error.value = err.message || "Failed to get task";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all tasks for a section
  const loadTasksBySection = async (sectionID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListTasksBySection", sectionID);
      tasks.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load tasks";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Move a task to a different section
  const moveTaskToSection = async (
    taskID: number,
    sectionID: number,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("MoveTaskToSection", taskID, sectionID);
      // Refresh the task list after move
      await loadTasksBySection(sectionID);
    } catch (err: any) {
      error.value = err.message || "Failed to move task";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Reorder tasks within a section
  const reorderTasks = async (
    sectionID: number,
    taskIDs: number[],
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("ReorderTasks", sectionID, taskIDs);
      // Refresh the task list after reorder
      await loadTasksBySection(sectionID);
    } catch (err: any) {
      error.value = err.message || "Failed to reorder tasks";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Soft delete a task
  const softDeleteTask = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("SoftDeleteTask", id);
      // Remove from local state
      tasks.value = tasks.value.filter((t) => t.id !== id);
      // Clear current task if it was deleted
      if (currentTask.value?.id === id) {
        currentTask.value = null;
      }
      success("Task deleted successfully");
    } catch (err: any) {
      error.value = err.message || "Failed to delete task";
      showError(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Restore a soft-deleted task
  const restoreTask = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("RestoreTask", id);
      // Reload the task to get updated state
      await getTask(id);
    } catch (err: any) {
      error.value = err.message || "Failed to restore task";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Archive a task
  const archiveTask = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("ArchiveTask", id);
      // Remove from local state
      tasks.value = tasks.value.filter((t) => t.id !== id);
      // Clear current task if it was archived
      if (currentTask.value?.id === id) {
        currentTask.value = null;
      }
    } catch (err: any) {
      error.value = err.message || "Failed to archive task";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Subtask CRUD operations

  // Create a new subtask
  const createSubtask = async (
    subtask: Omit<Subtask, "id" | "created_at" | "updated_at">,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("CreateSubtask", subtask);
      // Refresh the subtask list after creation
      if (subtask.task_id) {
        await loadSubtasksByTask(subtask.task_id);
      }
    } catch (err: any) {
      error.value = err.message || "Failed to create subtask";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update an existing subtask
  const updateSubtask = async (subtask: Subtask): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("UpdateSubtask", subtask);
      // Refresh the subtask list after update
      if (subtask.task_id) {
        await loadSubtasksByTask(subtask.task_id);
      }
      // Update current subtask if it's the one being edited
      if (currentSubtask.value?.id === subtask.id) {
        currentSubtask.value = subtask;
      }
    } catch (err: any) {
      error.value = err.message || "Failed to update subtask";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a subtask by ID
  const getSubtask = async (id: number): Promise<Subtask> => {
    loading.value = true;
    error.value = null;

    try {
      const subtask = await callBackend("GetSubtask", id);
      currentSubtask.value = subtask;
      return subtask;
    } catch (err: any) {
      error.value = err.message || "Failed to get subtask";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Load all subtasks for a task
  const loadSubtasksByTask = async (taskID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await callBackend("ListSubtasksByTask", taskID);
      subtasks.value = result || [];
    } catch (err: any) {
      error.value = err.message || "Failed to load subtasks";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Soft delete a subtask
  const softDeleteSubtask = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("SoftDeleteSubtask", id);
      // Remove from local state
      subtasks.value = subtasks.value.filter((s) => s.id !== id);
      // Clear current subtask if it was deleted
      if (currentSubtask.value?.id === id) {
        currentSubtask.value = null;
      }
    } catch (err: any) {
      error.value = err.message || "Failed to delete subtask";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Soft delete all subtasks of a task
  const softDeleteAllSubtasks = async (taskID: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("SoftDeleteAllSubtasks", taskID);
      // Clear local state for this task's subtasks
      subtasks.value = subtasks.value.filter((s) => s.task_id !== taskID);
    } catch (err: any) {
      error.value = err.message || "Failed to delete all subtasks";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Restore a soft-deleted subtask
  const restoreSubtask = async (id: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await callBackend("RestoreSubtask", id);
      // Reload the subtask to get updated state
      await getSubtask(id);
    } catch (err: any) {
      error.value = err.message || "Failed to restore subtask";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Set the current task
  const setCurrentTask = (task: Task | null): void => {
    currentTask.value = task;
  };

  // Set the current subtask
  const setCurrentSubtask = (subtask: Subtask | null): void => {
    currentSubtask.value = subtask;
  };

  // Clear error
  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State
    tasks,
    subtasks,
    currentTask,
    currentSubtask,
    loading,
    error,

    // Task methods
    createTask,
    updateTask,
    getTask,
    loadTasksBySection,
    moveTaskToSection,
    reorderTasks,
    softDeleteTask,
    restoreTask,
    archiveTask,

    // Subtask methods
    createSubtask,
    updateSubtask,
    getSubtask,
    loadSubtasksByTask,
    softDeleteSubtask,
    softDeleteAllSubtasks,
    restoreSubtask,

    // Utility methods
    setCurrentTask,
    setCurrentSubtask,
    clearError,
  };
}
