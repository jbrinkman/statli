import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProjects } from "./useProjects";

describe("useProjects", () => {
  let mockApp: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockApp = {
      CreateProject: vi.fn(),
      UpdateProject: vi.fn(),
      GetProject: vi.fn(),
      ListActiveProjects: vi.fn(),
      ListArchivedProjects: vi.fn(),
      ArchiveProject: vi.fn(),
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

  describe("createProject", () => {
    it("should create a project and refresh active projects", async () => {
      const { createProject, loading, error } = useProjects();

      const newProject = {
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
      };

      mockApp.CreateProject.mockResolvedValue(undefined);
      mockApp.ListActiveProjects.mockResolvedValue([
        {
          id: 1,
          ...newProject,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]);

      await createProject(newProject);

      expect(mockApp.CreateProject).toHaveBeenCalledWith(newProject);
      expect(mockApp.ListActiveProjects).toHaveBeenCalled();
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during project creation", async () => {
      const { createProject, loading, error } = useProjects();

      const newProject = {
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
      };

      mockApp.CreateProject.mockRejectedValue(new Error("Creation failed"));

      await expect(createProject(newProject)).rejects.toThrow(
        "Creation failed",
      );
      expect(error.value).toBe("Creation failed");
      expect(loading.value).toBe(false);
    });
  });

  describe("updateProject", () => {
    it("should update a project and refresh active projects", async () => {
      const { updateProject, loading, error } = useProjects();

      const project = {
        id: 1,
        name: "Updated Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: true,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateProject.mockResolvedValue(undefined);
      mockApp.ListActiveProjects.mockResolvedValue([project]);

      await updateProject(project);

      expect(mockApp.UpdateProject).toHaveBeenCalledWith(project);
      expect(mockApp.ListActiveProjects).toHaveBeenCalled();
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during project update", async () => {
      const { updateProject, error } = useProjects();

      const project = {
        id: 1,
        name: "Updated Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: true,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateProject.mockRejectedValue(new Error("Update failed"));

      await expect(updateProject(project)).rejects.toThrow("Update failed");
      expect(error.value).toBe("Update failed");
    });
  });

  describe("getProject", () => {
    it("should fetch a project by ID", async () => {
      const { getProject, currentProject, loading, error } = useProjects();

      const project = {
        id: 1,
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockApp.GetProject.mockResolvedValue(project);

      const result = await getProject(1);

      expect(mockApp.GetProject).toHaveBeenCalledWith(1);
      expect(result).toEqual(project);
      expect(currentProject.value).toEqual(project);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when fetching a project", async () => {
      const { getProject, error } = useProjects();

      mockApp.GetProject.mockRejectedValue(new Error("Project not found"));

      await expect(getProject(999)).rejects.toThrow("Project not found");
      expect(error.value).toBe("Project not found");
    });
  });

  describe("loadActiveProjects", () => {
    it("should load all active projects", async () => {
      const { loadActiveProjects, activeProjects, projects, loading, error } =
        useProjects();

      const mockProjects = [
        {
          id: 1,
          name: "Project 1",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/reports",
          use_year_subfolders: false,
          recipients_to: "test@example.com",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          name: "Project 2",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/reports",
          use_year_subfolders: true,
          recipients_to: "test2@example.com",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: false,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.ListActiveProjects.mockResolvedValue(mockProjects);

      await loadActiveProjects();

      expect(mockApp.ListActiveProjects).toHaveBeenCalled();
      expect(activeProjects.value).toEqual(mockProjects);
      expect(projects.value).toEqual(mockProjects);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle empty project list", async () => {
      const { loadActiveProjects, activeProjects, projects } = useProjects();

      mockApp.ListActiveProjects.mockResolvedValue([]);

      await loadActiveProjects();

      expect(activeProjects.value).toEqual([]);
      expect(projects.value).toEqual([]);
    });

    it("should handle errors when loading active projects", async () => {
      const { loadActiveProjects, error } = useProjects();

      mockApp.ListActiveProjects.mockRejectedValue(new Error("Load failed"));

      await expect(loadActiveProjects()).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("loadArchivedProjects", () => {
    it("should load all archived projects", async () => {
      const { loadArchivedProjects, archivedProjects, loading, error } =
        useProjects();

      const mockProjects = [
        {
          id: 3,
          name: "Archived Project",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/reports",
          use_year_subfolders: false,
          recipients_to: "archived@example.com",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: true,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      mockApp.ListArchivedProjects.mockResolvedValue(mockProjects);

      await loadArchivedProjects();

      expect(mockApp.ListArchivedProjects).toHaveBeenCalled();
      expect(archivedProjects.value).toEqual(mockProjects);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading archived projects", async () => {
      const { loadArchivedProjects, error } = useProjects();

      mockApp.ListArchivedProjects.mockRejectedValue(new Error("Load failed"));

      await expect(loadArchivedProjects()).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("archiveProject", () => {
    it("should archive a project and refresh both lists", async () => {
      const { archiveProject, loading, error } = useProjects();

      mockApp.ArchiveProject.mockResolvedValue(undefined);
      mockApp.ListActiveProjects.mockResolvedValue([]);
      mockApp.ListArchivedProjects.mockResolvedValue([
        {
          id: 1,
          name: "Archived Project",
          filename_format: "{project-name}-{YYYY-MM-DD}.md",
          report_title_format: "{project-name} Report",
          default_directory: "/reports",
          use_year_subfolders: false,
          recipients_to: "test@example.com",
          recipients_cc: "",
          recipients_bcc: "",
          is_archived: true,
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
        },
      ]);

      await archiveProject(1);

      expect(mockApp.ArchiveProject).toHaveBeenCalledWith(1);
      expect(mockApp.ListActiveProjects).toHaveBeenCalled();
      expect(mockApp.ListArchivedProjects).toHaveBeenCalled();
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should clear current project if it was archived", async () => {
      const { archiveProject, currentProject, setCurrentProject } =
        useProjects();

      setCurrentProject({
        id: 1,
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      });

      mockApp.ArchiveProject.mockResolvedValue(undefined);
      mockApp.ListActiveProjects.mockResolvedValue([]);
      mockApp.ListArchivedProjects.mockResolvedValue([]);

      await archiveProject(1);

      expect(currentProject.value).toBe(null);
    });

    it("should handle errors when archiving a project", async () => {
      const { archiveProject, error } = useProjects();

      mockApp.ArchiveProject.mockRejectedValue(new Error("Archive failed"));

      await expect(archiveProject(1)).rejects.toThrow("Archive failed");
      expect(error.value).toBe("Archive failed");
    });
  });

  describe("utility methods", () => {
    it("should set current project", () => {
      const { setCurrentProject, currentProject } = useProjects();

      const project = {
        id: 1,
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      setCurrentProject(project);
      expect(currentProject.value).toEqual(project);

      setCurrentProject(null);
      expect(currentProject.value).toBe(null);
    });

    it("should clear error", () => {
      const { clearError, error } = useProjects();

      // Manually set error
      error.value = "Test error";
      expect(error.value).toBe("Test error");

      clearError();
      expect(error.value).toBe(null);
    });
  });

  describe("backend call error handling", () => {
    it("should handle missing Wails runtime", async () => {
      const { createProject, error } = useProjects();

      // Remove window.go
      (global as any).window = {};

      const newProject = {
        name: "Test Project",
        filename_format: "{project-name}-{YYYY-MM-DD}.md",
        report_title_format: "{project-name} Report",
        default_directory: "/reports",
        use_year_subfolders: false,
        recipients_to: "test@example.com",
        recipients_cc: "",
        recipients_bcc: "",
        is_archived: false,
      };

      await expect(createProject(newProject)).rejects.toThrow(
        "Wails method CreateProject not available",
      );
      expect(error.value).toContain("CreateProject not available");
    });
  });
});
