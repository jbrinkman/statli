import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { ref } from "vue";
import ReportView from "./ReportView.vue";
import type { Project } from "../composables/useProjects";
import type { ReportSection, GeneratedReport } from "../composables/useReports";

// Create a mock factory function
const createMockUseReports = (overrides = {}) => {
  const defaults = {
    reportSections: ref([]),
    generatedReport: ref(null),
    loading: ref(false),
    error: ref(null),
    loadReportSections: vi.fn(),
    updateReportSection: vi.fn(),
    generateReport: vi.fn(),
    finalizeReport: vi.fn(),
    exportToFile: vi.fn(),
    getSuggestedFilepath: vi.fn(() => Promise.resolve("/path/to/report.md")),
    copyToClipboard: vi.fn(),
    clearError: vi.fn(),
  };

  return {
    ...defaults,
    ...overrides,
  };
};

// Mock the composables
vi.mock("../composables/useReports", () => ({
  useReports: vi.fn(() => createMockUseReports()),
}));

describe("ReportView", () => {
  let wrapper: VueWrapper;
  let mockProject: Project;
  let mockReportSections: ReportSection[];
  let mockGeneratedReport: GeneratedReport;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock project
    mockProject = {
      id: 1,
      name: "Test Project",
      filename_format: "{project-name}-{YYYY-MM-DD}.md",
      report_title_format: "{project-name} Status Report",
      default_directory: "/reports",
      use_year_subfolders: false,
      recipients_to: "team@example.com",
      recipients_cc: "",
      recipients_bcc: "",
      is_archived: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // Create mock report sections
    mockReportSections = [
      {
        id: 1,
        project_id: 1,
        name: "TL;DR",
        type: "prose",
        content: "Summary content",
        order: 1,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        project_id: 1,
        name: "Completed",
        type: "status",
        content: "",
        order: 2,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    // Create mock generated report
    mockGeneratedReport = {
      Title: "Test Project Status Report",
      Recipients: {
        To: "team@example.com",
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
          Name: "Completed",
          Type: "status",
          Content: '- Task 1 <span class="status-green">done</span>',
        },
      ],
      CSS: "<style>.status-green { color: green; }</style>",
    };
  });

  it("renders the component with project name", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    expect(wrapper.find(".project-name").text()).toContain("Test Project");
  });

  it("displays back button", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const backButton = wrapper.find(".btn-back");
    expect(backButton.exists()).toBe(true);
    expect(backButton.text()).toContain("Back to Tasks");
  });

  it("displays action buttons", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    expect(wrapper.find(".btn-copy").exists()).toBe(true);
    expect(wrapper.find(".btn-export").exists()).toBe(true);
    expect(wrapper.find(".btn-finalize").exists()).toBe(true);
  });

  it("displays generate report button", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const generateButton = wrapper.find(".btn-generate");
    expect(generateButton.exists()).toBe(true);
    expect(generateButton.text()).toContain("Generate Report");
  });

  it("displays date selector with default date", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const dateInput = wrapper.find(".date-input");
    expect(dateInput.exists()).toBe(true);
    expect(dateInput.element).toBeInstanceOf(HTMLInputElement);
  });

  it("emits navigate-back event when back button is clicked", async () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    await wrapper.find(".btn-back").trigger("click");
    expect(wrapper.emitted("navigate-back")).toBeTruthy();
  });

  it("disables action buttons when no report is generated", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const copyButton = wrapper.find(".btn-copy");
    const exportButton = wrapper.find(".btn-export");
    const finalizeButton = wrapper.find(".btn-finalize");

    expect((copyButton.element as HTMLButtonElement).disabled).toBe(true);
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(true);
    expect((finalizeButton.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("displays ReportPreview component", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    expect(wrapper.findComponent({ name: "ReportPreview" }).exists()).toBe(
      true,
    );
  });

  it("displays section toggles header", () => {
    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    expect(wrapper.find(".panel-header h2").text()).toBe("Report Sections");
  });

  it("shows loading state on generate button when loading", async () => {
    const { useReports } = await import("../composables/useReports");
    const mockUseReports = useReports as any;
    mockUseReports.mockReturnValue(
      createMockUseReports({
        loading: ref(true),
      }),
    );

    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const generateButton = wrapper.find(".btn-generate");
    expect(generateButton.text()).toContain("Generating...");
    expect((generateButton.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("displays error message when error occurs", async () => {
    const { useReports } = await import("../composables/useReports");
    const mockUseReports = useReports as any;
    mockUseReports.mockReturnValue(
      createMockUseReports({
        error: ref("Failed to generate report"),
      }),
    );

    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    expect(wrapper.find(".error").exists()).toBe(true);
    expect(wrapper.find(".error").text()).toBe("Failed to generate report");
  });

  it("renders section toggles when sections are loaded", async () => {
    const { useReports } = await import("../composables/useReports");
    const mockUseReports = useReports as any;
    mockUseReports.mockReturnValue(
      createMockUseReports({
        reportSections: ref(mockReportSections),
      }),
    );

    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const toggles = wrapper.findAll(".section-toggle");
    expect(toggles).toHaveLength(2);
    expect(toggles[0].text()).toContain("TL;DR");
    expect(toggles[0].text()).toContain("prose");
    expect(toggles[1].text()).toContain("Completed");
    expect(toggles[1].text()).toContain("status");
  });

  it("enables action buttons when report is generated", async () => {
    const { useReports } = await import("../composables/useReports");
    const mockUseReports = useReports as any;
    mockUseReports.mockReturnValue(
      createMockUseReports({
        generatedReport: ref(mockGeneratedReport),
      }),
    );

    wrapper = mount(ReportView, {
      props: {
        project: mockProject,
      },
    });

    const copyButton = wrapper.find(".btn-copy");
    const exportButton = wrapper.find(".btn-export");
    const finalizeButton = wrapper.find(".btn-finalize");

    expect((copyButton.element as HTMLButtonElement).disabled).toBe(false);
    expect((exportButton.element as HTMLButtonElement).disabled).toBe(false);
    expect((finalizeButton.element as HTMLButtonElement).disabled).toBe(false);
  });

  // Navigation Tests
  describe("Navigation", () => {
    it("emits navigate-back event when back button is clicked", async () => {
      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-back").trigger("click");

      expect(wrapper.emitted("navigate-back")).toBeTruthy();
      expect(wrapper.emitted("navigate-back")).toHaveLength(1);
    });

    it("maintains project context during navigation", () => {
      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      expect(wrapper.props("project")).toEqual(mockProject);
      expect(wrapper.find(".project-name").text()).toContain(mockProject.name);
    });

    it("displays project name in header consistently", () => {
      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const projectName = wrapper.find(".project-name");
      expect(projectName.exists()).toBe(true);
      expect(projectName.text()).toContain("Test Project");
      expect(projectName.text()).toContain("Report");
    });
  });

  // Data Flow Tests
  describe("Data Flow", () => {
    it("loads report sections on mount", async () => {
      const mockLoadReportSections = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          loadReportSections: mockLoadReportSections,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      // Wait for onMounted to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLoadReportSections).toHaveBeenCalledWith(mockProject.id);
    });

    it("flows report sections from composable to view", async () => {
      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          reportSections: ref(mockReportSections),
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const toggles = wrapper.findAll(".section-toggle");
      expect(toggles).toHaveLength(2);
      expect(toggles[0].text()).toContain("TL;DR");
      expect(toggles[1].text()).toContain("Completed");
    });

    it("flows generated report to ReportPreview component", async () => {
      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const reportPreview = wrapper.findComponent({ name: "ReportPreview" });
      expect(reportPreview.exists()).toBe(true);
      // Vue unwraps refs when passing as props
      expect(reportPreview.props("report")).toEqual(mockGeneratedReport);
    });

    it("updates section toggle state and calls composable", async () => {
      const mockUpdateReportSection = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          reportSections: ref(mockReportSections),
          updateReportSection: mockUpdateReportSection,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const firstToggle = wrapper.find(".toggle-checkbox");
      await firstToggle.trigger("change");
      await wrapper.vm.$nextTick();

      expect(mockUpdateReportSection).toHaveBeenCalled();
    });

    it("calls generateReport with project ID and date", async () => {
      const mockGenerateReport = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generateReport: mockGenerateReport,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-generate").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockGenerateReport).toHaveBeenCalledWith(
        mockProject.id,
        expect.any(String),
      );
    });

    it("calls exportToFile with correct parameters", async () => {
      const mockExportToFile = vi.fn().mockResolvedValue(undefined);
      const mockGetSuggestedFilepath = vi
        .fn()
        .mockResolvedValue("/path/to/report.md");

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          exportToFile: mockExportToFile,
          getSuggestedFilepath: mockGetSuggestedFilepath,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-export").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockGetSuggestedFilepath).toHaveBeenCalledWith(
        mockProject.id,
        expect.any(String),
      );
      expect(mockExportToFile).toHaveBeenCalledWith(
        expect.any(String),
        "/path/to/report.md",
      );
    });

    it("calls finalizeReport with markdown content", async () => {
      const mockFinalizeReport = vi.fn().mockResolvedValue(undefined);
      // Mock window.confirm
      global.confirm = vi.fn(() => true);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          finalizeReport: mockFinalizeReport,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-finalize").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockFinalizeReport).toHaveBeenCalledWith(
        mockProject.id,
        expect.any(String),
      );
    });

    it("calls copyToClipboard with markdown content", async () => {
      const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          copyToClipboard: mockCopyToClipboard,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-copy").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockCopyToClipboard).toHaveBeenCalledWith(expect.any(String));
    });

    it("flows loading state to UI elements", async () => {
      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          loading: ref(true),
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const generateButton = wrapper.find(".btn-generate");
      expect(generateButton.text()).toContain("Generating...");
      expect((generateButton.element as HTMLButtonElement).disabled).toBe(true);

      const reportPreview = wrapper.findComponent({ name: "ReportPreview" });
      // Vue unwraps refs when passing as props
      expect(reportPreview.props("loading")).toBe(true);
    });

    it("flows error state to UI elements", async () => {
      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          error: ref("Test error message"),
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      expect(wrapper.find(".error").exists()).toBe(true);
      expect(wrapper.find(".error").text()).toBe("Test error message");

      const reportPreview = wrapper.findComponent({ name: "ReportPreview" });
      // Vue unwraps refs when passing as props
      expect(reportPreview.props("error")).toBe("Test error message");
    });

    it("displays success message after successful generation", async () => {
      const mockGenerateReport = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generateReport: mockGenerateReport,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-generate").trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".success").exists()).toBe(true);
      expect(wrapper.find(".success").text()).toContain(
        "Report generated successfully",
      );
    });

    it("displays success message after successful export", async () => {
      const mockExportToFile = vi.fn().mockResolvedValue(undefined);
      const mockGetSuggestedFilepath = vi
        .fn()
        .mockResolvedValue("/path/to/report.md");

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          exportToFile: mockExportToFile,
          getSuggestedFilepath: mockGetSuggestedFilepath,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-export").trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".success").exists()).toBe(true);
      expect(wrapper.find(".success").text()).toContain("Report exported to");
    });

    it("displays success message after successful finalization", async () => {
      const mockFinalizeReport = vi.fn().mockResolvedValue(undefined);
      global.confirm = vi.fn(() => true);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          finalizeReport: mockFinalizeReport,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-finalize").trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".success").exists()).toBe(true);
      expect(wrapper.find(".success").text()).toContain(
        "Report finalized successfully",
      );
    });

    it("converts GeneratedReport to markdown correctly", async () => {
      const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generatedReport: ref(mockGeneratedReport),
          copyToClipboard: mockCopyToClipboard,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-copy").trigger("click");
      await wrapper.vm.$nextTick();

      const calledMarkdown = mockCopyToClipboard.mock.calls[0][0];
      expect(calledMarkdown).toContain("**To:** team@example.com");
      expect(calledMarkdown).toContain("# Test Project Status Report");
      expect(calledMarkdown).toContain("## TL;DR");
      expect(calledMarkdown).toContain("## Completed");
      expect(calledMarkdown).toContain(".status-green");
    });

    it("handles date changes correctly", async () => {
      const mockGenerateReport = vi.fn().mockResolvedValue(undefined);

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          generateReport: mockGenerateReport,
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      const dateInput = wrapper.find(".date-input");
      await dateInput.setValue("2024-12-25");
      await wrapper.vm.$nextTick();

      await wrapper.find(".btn-generate").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockGenerateReport).toHaveBeenCalledWith(
        mockProject.id,
        "2024-12-25",
      );
    });

    it("clears error when clearError is called", async () => {
      const mockClearError = vi.fn();

      const { useReports } = await import("../composables/useReports");
      const mockUseReports = useReports as any;
      mockUseReports.mockReturnValue(
        createMockUseReports({
          error: ref("Test error"),
          clearError: mockClearError,
          generateReport: vi.fn().mockResolvedValue(undefined),
        }),
      );

      wrapper = mount(ReportView, {
        props: {
          project: mockProject,
        },
      });

      await wrapper.find(".btn-generate").trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
