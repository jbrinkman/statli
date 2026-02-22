import { describe, it, expect, beforeEach, vi } from "vitest";
import { useReports } from "./useReports";

describe("useReports", () => {
  let mockApp: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockApp = {
      CreateReportSection: vi.fn(),
      UpdateReportSection: vi.fn(),
      GetReportSection: vi.fn(),
      ListReportSections: vi.fn(),
      ReorderSections: vi.fn(),
      CreateStatusDefinition: vi.fn(),
      UpdateStatusDefinition: vi.fn(),
      ListStatusDefinitions: vi.fn(),
      GenerateReport: vi.fn(),
      FinalizeReport: vi.fn(),
      GetReportSnapshot: vi.fn(),
      ListReportSnapshots: vi.fn(),
      ExportToFile: vi.fn(),
      GetSuggestedFilepath: vi.fn(),
      CopyToClipboard: vi.fn(),
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

  describe("createReportSection", () => {
    it("should create a report section and refresh section list", async () => {
      const { createReportSection, loading, error } = useReports();

      const newSection = {
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 0,
        is_enabled: true,
      };

      mockApp.CreateReportSection.mockResolvedValue(undefined);
      mockApp.ListReportSections.mockResolvedValue([
        {
          id: 1,
          ...newSection,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]);

      await createReportSection(newSection);

      expect(mockApp.CreateReportSection).toHaveBeenCalledWith(newSection);
      expect(mockApp.ListReportSections).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during section creation", async () => {
      const { createReportSection, error } = useReports();

      const newSection = {
        project_id: 1,
        name: "Test Section",
        type: "status",
        content: "",
        order: 0,
        is_enabled: true,
      };

      mockApp.CreateReportSection.mockRejectedValue(
        new Error("Creation failed"),
      );

      await expect(createReportSection(newSection)).rejects.toThrow(
        "Creation failed",
      );
      expect(error.value).toBe("Creation failed");
    });
  });

  describe("updateReportSection", () => {
    it("should update a report section and refresh section list", async () => {
      const { updateReportSection, loading, error } = useReports();

      const section = {
        id: 1,
        project_id: 1,
        name: "Updated Section",
        type: "prose",
        content: "Updated content",
        order: 0,
        is_enabled: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateReportSection.mockResolvedValue(undefined);
      mockApp.ListReportSections.mockResolvedValue([section]);

      await updateReportSection(section);

      expect(mockApp.UpdateReportSection).toHaveBeenCalledWith(section);
      expect(mockApp.ListReportSections).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during section update", async () => {
      const { updateReportSection, error } = useReports();

      const section = {
        id: 1,
        project_id: 1,
        name: "Updated Section",
        type: "prose",
        content: "Updated content",
        order: 0,
        is_enabled: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateReportSection.mockRejectedValue(new Error("Update failed"));

      await expect(updateReportSection(section)).rejects.toThrow(
        "Update failed",
      );
      expect(error.value).toBe("Update failed");
    });
  });

  describe("getReportSection", () => {
    it("should fetch a report section by ID", async () => {
      const { getReportSection, currentReportSection, loading, error } =
        useReports();

      const section = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 0,
        is_enabled: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockApp.GetReportSection.mockResolvedValue(section);

      const result = await getReportSection(1);

      expect(mockApp.GetReportSection).toHaveBeenCalledWith(1);
      expect(result).toEqual(section);
      expect(currentReportSection.value).toEqual(section);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when fetching a section", async () => {
      const { getReportSection, error } = useReports();

      mockApp.GetReportSection.mockRejectedValue(
        new Error("Section not found"),
      );

      await expect(getReportSection(999)).rejects.toThrow("Section not found");
      expect(error.value).toBe("Section not found");
    });
  });

  describe("loadReportSections", () => {
    it("should load all report sections for a project", async () => {
      const { loadReportSections, reportSections, loading, error } =
        useReports();

      const mockSections = [
        {
          id: 1,
          project_id: 1,
          name: "Section 1",
          type: "prose",
          content: "Content 1",
          order: 0,
          is_enabled: true,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          project_id: 1,
          name: "Section 2",
          type: "status",
          content: "",
          order: 1,
          is_enabled: true,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
      ];

      mockApp.ListReportSections.mockResolvedValue(mockSections);

      await loadReportSections(1);

      expect(mockApp.ListReportSections).toHaveBeenCalledWith(1);
      expect(reportSections.value).toEqual(mockSections);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading sections", async () => {
      const { loadReportSections, error } = useReports();

      mockApp.ListReportSections.mockRejectedValue(new Error("Load failed"));

      await expect(loadReportSections(1)).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("reorderSections", () => {
    it("should reorder sections within a project", async () => {
      const { reorderSections, loading, error } = useReports();

      const sectionIDs = [3, 1, 2];

      mockApp.ReorderSections.mockResolvedValue(undefined);
      mockApp.ListReportSections.mockResolvedValue([]);

      await reorderSections(1, sectionIDs);

      expect(mockApp.ReorderSections).toHaveBeenCalledWith(1, sectionIDs);
      expect(mockApp.ListReportSections).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when reordering sections", async () => {
      const { reorderSections, error } = useReports();

      mockApp.ReorderSections.mockRejectedValue(new Error("Reorder failed"));

      await expect(reorderSections(1, [1, 2, 3])).rejects.toThrow(
        "Reorder failed",
      );
      expect(error.value).toBe("Reorder failed");
    });
  });

  describe("createStatusDefinition", () => {
    it("should create a status definition and refresh status list", async () => {
      const { createStatusDefinition, loading, error } = useReports();

      const newStatus = {
        project_id: 1,
        name: "In Progress",
        style: "yellow",
        order: 0,
      };

      mockApp.CreateStatusDefinition.mockResolvedValue(undefined);
      mockApp.ListStatusDefinitions.mockResolvedValue([
        {
          id: 1,
          ...newStatus,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]);

      await createStatusDefinition(newStatus);

      expect(mockApp.CreateStatusDefinition).toHaveBeenCalledWith(newStatus);
      expect(mockApp.ListStatusDefinitions).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during status creation", async () => {
      const { createStatusDefinition, error } = useReports();

      const newStatus = {
        project_id: 1,
        name: "Done",
        style: "green",
        order: 0,
      };

      mockApp.CreateStatusDefinition.mockRejectedValue(
        new Error("Creation failed"),
      );

      await expect(createStatusDefinition(newStatus)).rejects.toThrow(
        "Creation failed",
      );
      expect(error.value).toBe("Creation failed");
    });
  });

  describe("updateStatusDefinition", () => {
    it("should update a status definition and refresh status list", async () => {
      const { updateStatusDefinition, loading, error } = useReports();

      const status = {
        id: 1,
        project_id: 1,
        name: "Updated Status",
        style: "red",
        order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateStatusDefinition.mockResolvedValue(undefined);
      mockApp.ListStatusDefinitions.mockResolvedValue([status]);

      await updateStatusDefinition(status);

      expect(mockApp.UpdateStatusDefinition).toHaveBeenCalledWith(status);
      expect(mockApp.ListStatusDefinitions).toHaveBeenCalledWith(1);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during status update", async () => {
      const { updateStatusDefinition, error } = useReports();

      const status = {
        id: 1,
        project_id: 1,
        name: "Updated Status",
        style: "red",
        order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-02",
      };

      mockApp.UpdateStatusDefinition.mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(updateStatusDefinition(status)).rejects.toThrow(
        "Update failed",
      );
      expect(error.value).toBe("Update failed");
    });
  });

  describe("loadStatusDefinitions", () => {
    it("should load all status definitions for a project", async () => {
      const { loadStatusDefinitions, statusDefinitions, loading, error } =
        useReports();

      const mockStatuses = [
        {
          id: 1,
          project_id: 1,
          name: "Not Started",
          style: "gray",
          order: 0,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        {
          id: 2,
          project_id: 1,
          name: "In Progress",
          style: "yellow",
          order: 1,
          created_at: "2024-01-02",
          updated_at: "2024-01-02",
        },
        {
          id: 3,
          project_id: 1,
          name: "Done",
          style: "green",
          order: 2,
          created_at: "2024-01-03",
          updated_at: "2024-01-03",
        },
      ];

      mockApp.ListStatusDefinitions.mockResolvedValue(mockStatuses);

      await loadStatusDefinitions(1);

      expect(mockApp.ListStatusDefinitions).toHaveBeenCalledWith(1);
      expect(statusDefinitions.value).toEqual(mockStatuses);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading status definitions", async () => {
      const { loadStatusDefinitions, error } = useReports();

      mockApp.ListStatusDefinitions.mockRejectedValue(new Error("Load failed"));

      await expect(loadStatusDefinitions(1)).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("generateReport", () => {
    it("should generate a report for a project", async () => {
      const { generateReport, generatedReport, loading, error } = useReports();

      const mockReport = {
        Title: "Test Project Report - 2024-01-15",
        Recipients: {
          To: "test@example.com",
          CC: "",
          BCC: "",
        },
        Sections: [
          {
            Name: "TL;DR",
            Type: "prose",
            Content: "Summary content",
          },
          {
            Name: "Roadmap",
            Type: "status",
            Content: '- Task 1 <span class="status-green">done</span>',
          },
        ],
        CSS: "<style>.status-green { color: green; }</style>",
      };

      mockApp.GenerateReport.mockResolvedValue(mockReport);

      const result = await generateReport(1, "2024-01-15");

      expect(mockApp.GenerateReport).toHaveBeenCalledWith(1, "2024-01-15");
      expect(result).toEqual(mockReport);
      expect(generatedReport.value).toEqual(mockReport);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during report generation", async () => {
      const { generateReport, error } = useReports();

      mockApp.GenerateReport.mockRejectedValue(new Error("Generation failed"));

      await expect(generateReport(1, "2024-01-15")).rejects.toThrow(
        "Generation failed",
      );
      expect(error.value).toBe("Generation failed");
    });
  });

  describe("finalizeReport", () => {
    it("should finalize a report and capture task history", async () => {
      const { finalizeReport, currentReportSnapshot, loading, error } =
        useReports();

      const mockSnapshot = {
        id: 1,
        project_id: 1,
        markdown_content: "# Report Content",
        finalized_at: "2024-01-15T10:00:00Z",
      };

      mockApp.FinalizeReport.mockResolvedValue(mockSnapshot);

      const result = await finalizeReport(1, "# Report Content");

      expect(mockApp.FinalizeReport).toHaveBeenCalledWith(
        1,
        "# Report Content",
      );
      expect(result).toEqual(mockSnapshot);
      expect(currentReportSnapshot.value).toEqual(mockSnapshot);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during report finalization", async () => {
      const { finalizeReport, error } = useReports();

      mockApp.FinalizeReport.mockRejectedValue(
        new Error("Finalization failed"),
      );

      await expect(finalizeReport(1, "# Report Content")).rejects.toThrow(
        "Finalization failed",
      );
      expect(error.value).toBe("Finalization failed");
    });
  });

  describe("getReportSnapshot", () => {
    it("should fetch a report snapshot by ID", async () => {
      const { getReportSnapshot, currentReportSnapshot, loading, error } =
        useReports();

      const snapshot = {
        id: 1,
        project_id: 1,
        markdown_content: "# Report Content",
        finalized_at: "2024-01-15T10:00:00Z",
      };

      mockApp.GetReportSnapshot.mockResolvedValue(snapshot);

      const result = await getReportSnapshot(1);

      expect(mockApp.GetReportSnapshot).toHaveBeenCalledWith(1);
      expect(result).toEqual(snapshot);
      expect(currentReportSnapshot.value).toEqual(snapshot);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when fetching a snapshot", async () => {
      const { getReportSnapshot, error } = useReports();

      mockApp.GetReportSnapshot.mockRejectedValue(
        new Error("Snapshot not found"),
      );

      await expect(getReportSnapshot(999)).rejects.toThrow(
        "Snapshot not found",
      );
      expect(error.value).toBe("Snapshot not found");
    });
  });

  describe("loadReportSnapshots", () => {
    it("should load all report snapshots for a project", async () => {
      const { loadReportSnapshots, reportSnapshots, loading, error } =
        useReports();

      const mockSnapshots = [
        {
          id: 1,
          project_id: 1,
          markdown_content: "# Report 1",
          finalized_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          project_id: 1,
          markdown_content: "# Report 2",
          finalized_at: "2024-01-22T10:00:00Z",
        },
      ];

      mockApp.ListReportSnapshots.mockResolvedValue(mockSnapshots);

      await loadReportSnapshots(1);

      expect(mockApp.ListReportSnapshots).toHaveBeenCalledWith(1);
      expect(reportSnapshots.value).toEqual(mockSnapshots);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when loading snapshots", async () => {
      const { loadReportSnapshots, error } = useReports();

      mockApp.ListReportSnapshots.mockRejectedValue(new Error("Load failed"));

      await expect(loadReportSnapshots(1)).rejects.toThrow("Load failed");
      expect(error.value).toBe("Load failed");
    });
  });

  describe("exportToFile", () => {
    it("should export report content to a file", async () => {
      const { exportToFile, loading, error } = useReports();

      mockApp.ExportToFile.mockResolvedValue(undefined);

      await exportToFile("# Report Content", "/path/to/report.md");

      expect(mockApp.ExportToFile).toHaveBeenCalledWith(
        "# Report Content",
        "/path/to/report.md",
      );
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during file export", async () => {
      const { exportToFile, error } = useReports();

      mockApp.ExportToFile.mockRejectedValue(new Error("Export failed"));

      await expect(
        exportToFile("# Report Content", "/path/to/report.md"),
      ).rejects.toThrow("Export failed");
      expect(error.value).toBe("Export failed");
    });
  });

  describe("getSuggestedFilepath", () => {
    it("should get suggested filepath for a report", async () => {
      const { getSuggestedFilepath, loading, error } = useReports();

      mockApp.GetSuggestedFilepath.mockResolvedValue(
        "/reports/2024/project-2024-01-15.md",
      );

      const result = await getSuggestedFilepath(1, "2024-01-15");

      expect(mockApp.GetSuggestedFilepath).toHaveBeenCalledWith(
        1,
        "2024-01-15",
      );
      expect(result).toBe("/reports/2024/project-2024-01-15.md");
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors when getting suggested filepath", async () => {
      const { getSuggestedFilepath, error } = useReports();

      mockApp.GetSuggestedFilepath.mockRejectedValue(
        new Error("Failed to get filepath"),
      );

      await expect(getSuggestedFilepath(1, "2024-01-15")).rejects.toThrow(
        "Failed to get filepath",
      );
      expect(error.value).toBe("Failed to get filepath");
    });
  });

  describe("copyToClipboard", () => {
    it("should copy content to clipboard", async () => {
      const { copyToClipboard, loading, error } = useReports();

      mockApp.CopyToClipboard.mockResolvedValue(undefined);

      await copyToClipboard("# Report Content");

      expect(mockApp.CopyToClipboard).toHaveBeenCalledWith("# Report Content");
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should handle errors during clipboard copy", async () => {
      const { copyToClipboard, error } = useReports();

      mockApp.CopyToClipboard.mockRejectedValue(new Error("Copy failed"));

      await expect(copyToClipboard("# Report Content")).rejects.toThrow(
        "Copy failed",
      );
      expect(error.value).toBe("Copy failed");
    });
  });

  describe("utility methods", () => {
    it("should set current report section", () => {
      const { setCurrentReportSection, currentReportSection } = useReports();

      const section = {
        id: 1,
        project_id: 1,
        name: "Test Section",
        type: "prose",
        content: "Test content",
        order: 0,
        is_enabled: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      setCurrentReportSection(section);
      expect(currentReportSection.value).toEqual(section);

      setCurrentReportSection(null);
      expect(currentReportSection.value).toBe(null);
    });

    it("should set current status definition", () => {
      const { setCurrentStatusDefinition, currentStatusDefinition } =
        useReports();

      const status = {
        id: 1,
        project_id: 1,
        name: "In Progress",
        style: "yellow",
        order: 0,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      setCurrentStatusDefinition(status);
      expect(currentStatusDefinition.value).toEqual(status);

      setCurrentStatusDefinition(null);
      expect(currentStatusDefinition.value).toBe(null);
    });

    it("should set current report snapshot", () => {
      const { setCurrentReportSnapshot, currentReportSnapshot } = useReports();

      const snapshot = {
        id: 1,
        project_id: 1,
        markdown_content: "# Report Content",
        finalized_at: "2024-01-15T10:00:00Z",
      };

      setCurrentReportSnapshot(snapshot);
      expect(currentReportSnapshot.value).toEqual(snapshot);

      setCurrentReportSnapshot(null);
      expect(currentReportSnapshot.value).toBe(null);
    });

    it("should clear error", () => {
      const { clearError, error } = useReports();

      error.value = "Test error";
      expect(error.value).toBe("Test error");

      clearError();
      expect(error.value).toBe(null);
    });
  });

  describe("backend call error handling", () => {
    it("should handle missing Wails runtime", async () => {
      const { generateReport, error } = useReports();

      (global as any).window = {};

      await expect(generateReport(1, "2024-01-15")).rejects.toThrow(
        "Wails method GenerateReport not available",
      );
      expect(error.value).toContain("GenerateReport not available");
    });
  });
});
