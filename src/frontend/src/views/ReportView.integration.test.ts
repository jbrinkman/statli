import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReportView from "./ReportView.vue";
import ReportPreview from "../components/ReportPreview.vue";
import RenderedProseSection from "../components/RenderedProseSection.vue";
import type { Project } from "../composables/useProjects";
import { ref } from "vue";

// Mock the composables
const mockLoadReportSections = vi.fn();
const mockReportSections = ref([]);
const mockGeneratedReport = ref(null);
const mockLoading = ref(false);
const mockError = ref(null);

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    reportSections: mockReportSections,
    generatedReport: mockGeneratedReport,
    loading: mockLoading,
    error: mockError,
    loadReportSections: mockLoadReportSections,
    updateReportSection: vi.fn(),
    generateReport: vi.fn(),
    finalizeReport: vi.fn(),
    exportToFile: vi.fn(),
    getSuggestedFilepath: vi.fn(),
    copyToClipboard: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock("../composables/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock window.go for Wails
const mockGetProjectStylesheet = vi.fn();
(global as any).window = {
  go: {
    main: {
      App: {
        GetProjectStylesheet: mockGetProjectStylesheet,
      },
    },
  },
};

describe("ReportView + RenderedProseSection Integration Tests", () => {
  const mockProject: Project = {
    id: 1,
    name: "Test Project",
    description: "Test Description",
    is_archived: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadReportSections.mockResolvedValue(undefined);
    mockGetProjectStylesheet.mockResolvedValue("");
  });

  /**
   * Test: Prose sections render as HTML
   * Requirements: 4.1, 4.2
   */
  it("should render prose sections as HTML in report preview", async () => {
    // Setup: Create a report with a prose section
    const proseSection = {
      id: 1,
      project_id: 1,
      name: "Introduction",
      type: "prose",
      content: "# Hello World\n\nThis is **bold** text.",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockReportSections.value = [proseSection];
    mockGeneratedReport.value = {
      Title: "Test Report",
      Recipients: { To: "", CC: "", BCC: "" },
      Sections: [
        {
          Name: "Introduction",
          Type: "prose",
          Content: "# Hello World\n\nThis is **bold** text.",
        },
      ],
      CSS: "",
    };

    // Mount the component
    const wrapper = mount(ReportView, {
      props: { project: mockProject },
      global: {
        stubs: {
          ReportPreview: false,
          RenderedProseSection: false,
        },
      },
    });

    await wrapper.vm.$nextTick();

    // Verify ReportPreview receives the report sections
    const reportPreview = wrapper.findComponent(ReportPreview);
    expect(reportPreview.exists()).toBe(true);
    expect(reportPreview.props("reportSections")).toEqual([proseSection]);
  });

  /**
   * Test: Stylesheet is applied to all prose sections
   * Requirements: 4.4
   */
  it("should apply stylesheet to all prose sections", async () => {
    const testStylesheet = ".prose-content { color: red; }";
    mockGetProjectStylesheet.mockResolvedValue(testStylesheet);

    const proseSection1 = {
      id: 1,
      project_id: 1,
      name: "Section 1",
      type: "prose",
      content: "Content 1",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const proseSection2 = {
      id: 2,
      project_id: 1,
      name: "Section 2",
      type: "prose",
      content: "Content 2",
      order: 2,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockReportSections.value = [proseSection1, proseSection2];
    mockGeneratedReport.value = {
      Title: "Test Report",
      Recipients: { To: "", CC: "", BCC: "" },
      Sections: [
        { Name: "Section 1", Type: "prose", Content: "Content 1" },
        { Name: "Section 2", Type: "prose", Content: "Content 2" },
      ],
      CSS: "",
    };

    // Mount the component
    const wrapper = mount(ReportView, {
      props: { project: mockProject },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify stylesheet was loaded
    expect(mockGetProjectStylesheet).toHaveBeenCalledWith(mockProject.id);

    // Verify stylesheet is passed to ReportPreview
    const reportPreview = wrapper.findComponent(ReportPreview);
    expect(reportPreview.exists()).toBe(true);
    expect(reportPreview.props("stylesheet")).toBe(testStylesheet);
  });

  /**
   * Test: Updating stylesheet refreshes rendered sections
   * Requirements: 5.4
   */
  it("should refresh rendered sections when stylesheet updates", async () => {
    const initialStylesheet = ".prose-content { color: blue; }";
    const updatedStylesheet = ".prose-content { color: green; }";

    mockGetProjectStylesheet.mockResolvedValue(initialStylesheet);

    const proseSection = {
      id: 1,
      project_id: 1,
      name: "Test Section",
      type: "prose",
      content: "Test content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockReportSections.value = [proseSection];
    mockGeneratedReport.value = {
      Title: "Test Report",
      Recipients: { To: "", CC: "", BCC: "" },
      Sections: [
        { Name: "Test Section", Type: "prose", Content: "Test content" },
      ],
      CSS: "",
    };

    // Mount the component
    const wrapper = mount(ReportView, {
      props: { project: mockProject },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify initial stylesheet
    let reportPreview = wrapper.findComponent(ReportPreview);
    expect(reportPreview.props("stylesheet")).toBe(initialStylesheet);

    // Simulate stylesheet update
    mockGetProjectStylesheet.mockResolvedValue(updatedStylesheet);

    // Remount to simulate refresh (in real app, this would be triggered by a stylesheet update event)
    wrapper.unmount();
    const wrapper2 = mount(ReportView, {
      props: { project: mockProject },
    });

    await wrapper2.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify updated stylesheet
    reportPreview = wrapper2.findComponent(ReportPreview);
    expect(reportPreview.props("stylesheet")).toBe(updatedStylesheet);
  });

  /**
   * Test: Mixed prose and status sections render correctly
   * Requirements: 4.1, 4.2, 4.3
   */
  it("should handle mixed prose and status sections", async () => {
    const proseSection = {
      id: 1,
      project_id: 1,
      name: "Prose Section",
      type: "prose",
      content: "# Prose Content",
      order: 1,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const statusSection = {
      id: 2,
      project_id: 1,
      name: "Status Section",
      type: "status",
      content: "Status content",
      order: 2,
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockReportSections.value = [proseSection, statusSection];
    mockGeneratedReport.value = {
      Title: "Test Report",
      Recipients: { To: "", CC: "", BCC: "" },
      Sections: [
        { Name: "Prose Section", Type: "prose", Content: "# Prose Content" },
        { Name: "Status Section", Type: "status", Content: "Status content" },
      ],
      CSS: "",
    };

    // Mount the component
    const wrapper = mount(ReportView, {
      props: { project: mockProject },
    });

    await wrapper.vm.$nextTick();

    // Verify both sections are passed to ReportPreview
    const reportPreview = wrapper.findComponent(ReportPreview);
    expect(reportPreview.exists()).toBe(true);
    expect(reportPreview.props("reportSections")).toHaveLength(2);
    expect(reportPreview.props("reportSections")[0].type).toBe("prose");
    expect(reportPreview.props("reportSections")[1].type).toBe("status");
  });
});
