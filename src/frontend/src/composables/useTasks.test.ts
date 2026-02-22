import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTasks } from "./useTasks";

describe("useTasks", () => {
  let mockApp: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockApp = {
      CreateTask: vi.fn(),
      UpdateTask: vi.fn(),
      GetTask: vi.fn(),
      ListTasksBySection: vi.fn(),
      MoveTaskToSection: vi.fn(),
      ReorderTasks: vi.fn(),
      SoftDeleteTask: vi.fn(),
      RestoreTask: vi.fn(),
      ArchiveTask: vi.fn(),
      CreateSubtask: vi.fn(),
      UpdateSubtask: vi.fn(),
      GetSubtask: vi.fn(),
      ListSubtasksByTask: vi.fn(),
      SoftDeleteSubtask: vi.fn(),
      SoftDeleteAllSubtasks: vi.fn(),
      RestoreSubtask: vi.fn(),
    };

    // Mock window.go.main.App
    (global as any).window = {
      go: {
        main: {
          App: mockApp,
        },
      },
    };
  });

  describe("createTask", () => {
    it("should create a task and refresh task list", async () => {
      const { createTask, loading, error } = useTasks();

      const newTask = {
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Test notes",
        priority: 0,
        is_deleted: false,
        is_archived: false,
      };

      mockApp.CreateTask.mockResolvedValue(undefined);
      mockApp.ListTasksBySection.mockResolvedValue([
        {
          id: 1,
          ...newTask,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]);

      await createTask(newTask);

      expect(mockApp.CreateTask).toHaveBeenCalledWith(newTask);
      expect(mockApp.ListTasksBySection).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during task creation", async () => {
      const { createTask, error } = useTasks();

      const newTask = {
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
      };

      mockApp.CreateTask.mockRejectedValue(new Error("Creation failed"));

      await expect(createTask(newTask)).rejects.toThrow("Creation failed");
      expect(error.value).toBe("Creation failed");
    });
  });

  describe("updateTask", () => {
    it("should update a task and refresh task list", async () => {
      const { updateTask, loading, error } = useTasks();

      const task = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Updated Task",
        status: "done",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Updated notes",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateTask.mockResolvedValue(undefined);
      mockApp.ListTasksBySection.mockResolvedValue([task]);

      await updateTask(task);

      expect(mockApp.UpdateTask).toHaveBeenCalledWith(task);
      expect(mockApp.ListTasksBySection).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during task update", async () => {
      const { updateTask, error } = useTasks();

      const task = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Updated Task",
        status: "done",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateTask.mockRejectedValue(new Error("Update failed"));

      await expect(updateTask(task)).rejects.toThrow("Update failed");
      expect(error.value).toBe("Update failed");
    });
  });

  describe("getTask", () => {
    it("should fetch a task by ID", async () => {
      const { getTask, currentTask, loading, error } = useTasks();

      const task = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Test notes",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockApp.GetTask.mockResolvedValue(task);

      const result = await getTask(1);

      expect(mockApp.GetTask).toHaveBeenCalledWith(1);
      expect(result).toEqual(task);
      expect(currentTask.value).toEqual(task);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when fetching a task", async () => {
      const { getTask, error } = useTasks();

      mockApp.GetTask.mockRejectedValue(new Error("Task not found"));

      await expect(getTask(999)).rejects.toThrow("Task not found");
      expect(error.value).toBe("Task not found");
    });
  });

  describe("loadTasksBySection", () => {
    it("should load all tasks for a section", async () => {
      const { loadTasksBySection, tasks, loading, error } = useTasks();

      const mockTasks = [
        {
          id: 1,
          project_id: 1,
          report_section_id: 1,
          name: "Task 1",
          status: "in progress",
          expected_completion_date: "2024-12-31",
          url: "",
          notes: "",
          priority: 0,
          is_deleted: false,
          is_archived: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          project_id: 1,
          report_section_id: 1,
          name: "Task 2",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          priority: 1,
          is_deleted: false,
          is_archived: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.ListTasksBySection.mockResolvedValue(mockTasks);

      await loadTasksBySection(1);

      expect(mockApp.ListTasksBySection).toHaveBeenCalledWith(1);
      expect(tasks.value).toEqual(mockTasks);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading tasks", async () => {
      const { loadTasksBySection, error } = useTasks();

      mockApp.ListTasksBySection.mockRejectedValue(new Error("Load failed"));

      await expect(loadTasksBySection(1)).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("moveTaskToSection", () => {
    it("should move a task to a different section", async () => {
      const { moveTaskToSection, loading, error } = useTasks();

      mockApp.MoveTaskToSection.mockResolvedValue(undefined);
      mockApp.ListTasksBySection.mockResolvedValue([]);

      await moveTaskToSection(1, 2);

      expect(mockApp.MoveTaskToSection).toHaveBeenCalledWith(1, 2);
      expect(mockApp.ListTasksBySection).toHaveBeenCalledWith(2);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when moving a task", async () => {
      const { moveTaskToSection, error } = useTasks();

      mockApp.MoveTaskToSection.mockRejectedValue(new Error("Move failed"));

      await expect(moveTaskToSection(1, 2)).rejects.toThrow("Move failed");
      expect(error.value).toBe("Move failed");
    });
  });

  describe("reorderTasks", () => {
    it("should reorder tasks within a section", async () => {
      const { reorderTasks, loading, error } = useTasks();

      const taskIDs = [3, 1, 2];

      mockApp.ReorderTasks.mockResolvedValue(undefined);
      mockApp.ListTasksBySection.mockResolvedValue([]);

      await reorderTasks(1, taskIDs);

      expect(mockApp.ReorderTasks).toHaveBeenCalledWith(1, taskIDs);
      expect(mockApp.ListTasksBySection).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when reordering tasks", async () => {
      const { reorderTasks, error } = useTasks();

      mockApp.ReorderTasks.mockRejectedValue(new Error("Reorder failed"));

      await expect(reorderTasks(1, [1, 2, 3])).rejects.toThrow(
        "Reorder failed",
      );
      expect(error.value).toBe("Reorder failed");
    });
  });

  describe("softDeleteTask", () => {
    it("should soft delete a task", async () => {
      const { softDeleteTask, tasks, loading, error } = useTasks();

      // Set up initial tasks
      tasks.value = [
        {
          id: 1,
          project_id: 1,
          report_section_id: 1,
          name: "Task 1",
          status: "in progress",
          expected_completion_date: null,
          url: "",
          notes: "",
          priority: 0,
          is_deleted: false,
          is_archived: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          project_id: 1,
          report_section_id: 1,
          name: "Task 2",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          priority: 1,
          is_deleted: false,
          is_archived: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.SoftDeleteTask.mockResolvedValue(undefined);

      await softDeleteTask(1);

      expect(mockApp.SoftDeleteTask).toHaveBeenCalledWith(1);
      expect(tasks.value).toHaveLength(1);
      expect(tasks.value[0].id).toBe(2);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when soft deleting a task", async () => {
      const { softDeleteTask, error } = useTasks();

      mockApp.SoftDeleteTask.mockRejectedValue(new Error("Delete failed"));

      await expect(softDeleteTask(1)).rejects.toThrow("Delete failed");
      expect(error.value).toBe("Delete failed");
    });
  });

  describe("restoreTask", () => {
    it("should restore a soft-deleted task", async () => {
      const { restoreTask, loading, error } = useTasks();

      const restoredTask = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Restored Task",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.RestoreTask.mockResolvedValue(undefined);
      mockApp.GetTask.mockResolvedValue(restoredTask);

      await restoreTask(1);

      expect(mockApp.RestoreTask).toHaveBeenCalledWith(1);
      expect(mockApp.GetTask).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when restoring a task", async () => {
      const { restoreTask, error } = useTasks();

      mockApp.RestoreTask.mockRejectedValue(new Error("Restore failed"));

      await expect(restoreTask(1)).rejects.toThrow("Restore failed");
      expect(error.value).toBe("Restore failed");
    });
  });

  describe("archiveTask", () => {
    it("should archive a task", async () => {
      const { archiveTask, tasks, loading, error } = useTasks();

      tasks.value = [
        {
          id: 1,
          project_id: 1,
          report_section_id: 1,
          name: "Task 1",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          priority: 0,
          is_deleted: false,
          is_archived: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      mockApp.ArchiveTask.mockResolvedValue(undefined);

      await archiveTask(1);

      expect(mockApp.ArchiveTask).toHaveBeenCalledWith(1);
      expect(tasks.value).toHaveLength(0);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when archiving a task", async () => {
      const { archiveTask, error } = useTasks();

      mockApp.ArchiveTask.mockRejectedValue(new Error("Archive failed"));

      await expect(archiveTask(1)).rejects.toThrow("Archive failed");
      expect(error.value).toBe("Archive failed");
    });
  });

  describe("createSubtask", () => {
    it("should create a subtask and refresh subtask list", async () => {
      const { createSubtask, loading, error } = useTasks();

      const newSubtask = {
        task_id: 1,
        name: "Test Subtask",
        status: "in progress",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Test notes",
        is_deleted: false,
      };

      mockApp.CreateSubtask.mockResolvedValue(undefined);
      mockApp.ListSubtasksByTask.mockResolvedValue([
        {
          id: 1,
          ...newSubtask,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]);

      await createSubtask(newSubtask);

      expect(mockApp.CreateSubtask).toHaveBeenCalledWith(newSubtask);
      expect(mockApp.ListSubtasksByTask).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during subtask creation", async () => {
      const { createSubtask, error } = useTasks();

      const newSubtask = {
        task_id: 1,
        name: "Test Subtask",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        is_deleted: false,
      };

      mockApp.CreateSubtask.mockRejectedValue(new Error("Creation failed"));

      await expect(createSubtask(newSubtask)).rejects.toThrow(
        "Creation failed",
      );
      expect(error.value).toBe("Creation failed");
    });
  });

  describe("updateSubtask", () => {
    it("should update a subtask and refresh subtask list", async () => {
      const { updateSubtask, loading, error } = useTasks();

      const subtask = {
        id: 1,
        task_id: 1,
        name: "Updated Subtask",
        status: "done",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Updated notes",
        is_deleted: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateSubtask.mockResolvedValue(undefined);
      mockApp.ListSubtasksByTask.mockResolvedValue([subtask]);

      await updateSubtask(subtask);

      expect(mockApp.UpdateSubtask).toHaveBeenCalledWith(subtask);
      expect(mockApp.ListSubtasksByTask).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during subtask update", async () => {
      const { updateSubtask, error } = useTasks();

      const subtask = {
        id: 1,
        task_id: 1,
        name: "Updated Subtask",
        status: "done",
        expected_completion_date: null,
        url: "",
        notes: "",
        is_deleted: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateSubtask.mockRejectedValue(new Error("Update failed"));

      await expect(updateSubtask(subtask)).rejects.toThrow("Update failed");
      expect(error.value).toBe("Update failed");
    });
  });

  describe("getSubtask", () => {
    it("should fetch a subtask by ID", async () => {
      const { getSubtask, currentSubtask, loading, error } = useTasks();

      const subtask = {
        id: 1,
        task_id: 1,
        name: "Test Subtask",
        status: "in progress",
        expected_completion_date: "2024-12-31",
        url: "https://example.com",
        notes: "Test notes",
        is_deleted: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockApp.GetSubtask.mockResolvedValue(subtask);

      const result = await getSubtask(1);

      expect(mockApp.GetSubtask).toHaveBeenCalledWith(1);
      expect(result).toEqual(subtask);
      expect(currentSubtask.value).toEqual(subtask);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when fetching a subtask", async () => {
      const { getSubtask, error } = useTasks();

      mockApp.GetSubtask.mockRejectedValue(new Error("Subtask not found"));

      await expect(getSubtask(999)).rejects.toThrow("Subtask not found");
      expect(error.value).toBe("Subtask not found");
    });
  });

  describe("loadSubtasksByTask", () => {
    it("should load all subtasks for a task", async () => {
      const { loadSubtasksByTask, subtasks, loading, error } = useTasks();

      const mockSubtasks = [
        {
          id: 1,
          task_id: 1,
          name: "Subtask 1",
          status: "in progress",
          expected_completion_date: "2024-12-31",
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          task_id: 1,
          name: "Subtask 2",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.ListSubtasksByTask.mockResolvedValue(mockSubtasks);

      await loadSubtasksByTask(1);

      expect(mockApp.ListSubtasksByTask).toHaveBeenCalledWith(1);
      expect(subtasks.value).toEqual(mockSubtasks);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading subtasks", async () => {
      const { loadSubtasksByTask, error } = useTasks();

      mockApp.ListSubtasksByTask.mockRejectedValue(new Error("Load failed"));

      await expect(loadSubtasksByTask(1)).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("softDeleteSubtask", () => {
    it("should soft delete a subtask", async () => {
      const { softDeleteSubtask, subtasks, loading, error } = useTasks();

      subtasks.value = [
        {
          id: 1,
          task_id: 1,
          name: "Subtask 1",
          status: "in progress",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          task_id: 1,
          name: "Subtask 2",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.SoftDeleteSubtask.mockResolvedValue(undefined);

      await softDeleteSubtask(1);

      expect(mockApp.SoftDeleteSubtask).toHaveBeenCalledWith(1);
      expect(subtasks.value).toHaveLength(1);
      expect(subtasks.value[0].id).toBe(2);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when soft deleting a subtask", async () => {
      const { softDeleteSubtask, error } = useTasks();

      mockApp.SoftDeleteSubtask.mockRejectedValue(new Error("Delete failed"));

      await expect(softDeleteSubtask(1)).rejects.toThrow("Delete failed");
      expect(error.value).toBe("Delete failed");
    });
  });

  describe("softDeleteAllSubtasks", () => {
    it("should soft delete all subtasks of a task", async () => {
      const { softDeleteAllSubtasks, subtasks, loading, error } = useTasks();

      subtasks.value = [
        {
          id: 1,
          task_id: 1,
          name: "Subtask 1",
          status: "in progress",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          task_id: 1,
          name: "Subtask 2",
          status: "done",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
        {
          id: 3,
          task_id: 2,
          name: "Subtask 3",
          status: "in progress",
          expected_completion_date: null,
          url: "",
          notes: "",
          is_deleted: false,
          created_at: "2024-01-03",
          updated_at: "2024-01-03",
        },
      ];

      mockApp.SoftDeleteAllSubtasks.mockResolvedValue(undefined);

      await softDeleteAllSubtasks(1);

      expect(mockApp.SoftDeleteAllSubtasks).toHaveBeenCalledWith(1);
      expect(subtasks.value).toHaveLength(1);
      expect(subtasks.value[0].task_id).toBe(2);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when soft deleting all subtasks", async () => {
      const { softDeleteAllSubtasks, error } = useTasks();

      mockApp.SoftDeleteAllSubtasks.mockRejectedValue(
        new Error("Delete failed"),
      );

      await expect(softDeleteAllSubtasks(1)).rejects.toThrow("Delete failed");
      expect(error.value).toBe("Delete failed");
    });
  });

  describe("restoreSubtask", () => {
    it("should restore a soft-deleted subtask", async () => {
      const { restoreSubtask, loading, error } = useTasks();

      const restoredSubtask = {
        id: 1,
        task_id: 1,
        name: "Restored Subtask",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        is_deleted: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.RestoreSubtask.mockResolvedValue(undefined);
      mockApp.GetSubtask.mockResolvedValue(restoredSubtask);

      await restoreSubtask(1);

      expect(mockApp.RestoreSubtask).toHaveBeenCalledWith(1);
      expect(mockApp.GetSubtask).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when restoring a subtask", async () => {
      const { restoreSubtask, error } = useTasks();

      mockApp.RestoreSubtask.mockRejectedValue(new Error("Restore failed"));

      await expect(restoreSubtask(1)).rejects.toThrow("Restore failed");
      expect(error.value).toBe("Restore failed");
    });
  });

  describe("utility methods", () => {
    it("should set current task", () => {
      const { setCurrentTask, currentTask } = useTasks();

      const task = {
        id: 1,
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      setCurrentTask(task);
      expect(currentTask.value).toEqual(task);

      setCurrentTask(null);
      expect(currentTask.value).toBe(null);
    });

    it("should set current subtask", () => {
      const { setCurrentSubtask, currentSubtask } = useTasks();

      const subtask = {
        id: 1,
        task_id: 1,
        name: "Test Subtask",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        is_deleted: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      setCurrentSubtask(subtask);
      expect(currentSubtask.value).toEqual(subtask);

      setCurrentSubtask(null);
      expect(currentSubtask.value).toBe(null);
    });

    it("should clear error", () => {
      const { clearError, error } = useTasks();

      error.value = "Test error";
      expect(error.value).toBe("Test error");

      clearError();
      expect(error.value).toBe(null);
    });
  });

  describe("backend call error handling", () => {
    it("should handle missing Wails runtime", async () => {
      const { createTask, error } = useTasks();

      (global as any).window = {};

      const newTask = {
        project_id: 1,
        report_section_id: 1,
        name: "Test Task",
        status: "in progress",
        expected_completion_date: null,
        url: "",
        notes: "",
        priority: 0,
        is_deleted: false,
        is_archived: false,
      };

      await expect(createTask(newTask)).rejects.toThrow(
        "Wails method CreateTask not available",
      );
      expect(error.value).toContain("CreateTask not available");
    });
  });
});
