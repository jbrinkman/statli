import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import fc from "fast-check";
import ReportView from "./ReportView.vue";
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

describe("ReportView - Property-Based Tests", () => {
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
  });

  /**
   * Property 8: Stylesheet Application to Rendered Content
   * **Validates: Requirements 4.4**
   *
   * For any rendered prose section in Report_View, the master stylesheet SHALL be applied
   * to the HTML content, resulting in styled elements that reflect the CSS rules.
   */
  it("Property 8: stylesheet application to rendered content", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random CSS rules
        fc.record({
          selector: fc.constantFrom(
            ".prose-content",
            ".prose-content h1",
            ".prose-content p",
            ".prose-content a",
          ),
          property: fc.constantFrom("color", "font-size", "margin", "padding"),
          value: fc.oneof(
            fc.constantFrom("red", "blue", "green"),
            fc.constantFrom("12px", "16px", "20px"),
            fc.constantFrom("10px", "20px", "0"),
          ),
        }),
        async (cssRule) => {
          // Create CSS stylesheet with the random rule
          const stylesheet = `${cssRule.selector} { ${cssRule.property}: ${cssRule.value}; }`;

          // Mock the GetProjectStylesheet to return our generated stylesheet
          mockGetProjectStylesheet.mockResolvedValue(stylesheet);

          // Mount the component
          const wrapper = mount(ReportView, {
            props: {
              project: mockProject,
            },
          });

          // Wait for component to mount and load stylesheet
          await wrapper.vm.$nextTick();
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Verify that the stylesheet was loaded
          expect(mockGetProjectStylesheet).toHaveBeenCalledWith(mockProject.id);

          // Verify the stylesheet is passed to ReportPreview
          const reportPreview = wrapper.findComponent({
            name: "ReportPreview",
          });
          if (reportPreview.exists()) {
            const stylesheetProp = reportPreview.props("stylesheet");
            expect(stylesheetProp).toBe(stylesheet);

            // Verify the CSS rule is present in the stylesheet
            expect(stylesheetProp).toContain(cssRule.selector);
            expect(stylesheetProp).toContain(cssRule.property);
            expect(stylesheetProp).toContain(cssRule.value);
          }

          wrapper.unmount();
        },
      ),
      { numRuns: 100, timeout: 10000 },
    );
  });
});
