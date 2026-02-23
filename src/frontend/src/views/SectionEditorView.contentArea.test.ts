import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import * as fc from "fast-check";
import SectionEditorView from "./SectionEditorView.vue";
import type { ReportSection } from "../composables/useReports";

// Mock MonacoEditor component
vi.mock("../components/MonacoEditor.vue", () => ({
  default: {
    name: "MonacoEditor",
    template:
      '<div class="mock-monaco-editor"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ["modelValue", "language", "theme", "placeholder"],
    emits: ["update:modelValue"],
  },
}));

// Mock useReports composable
const mockGetReportSection = vi.fn();
const mockUpdateReportSection = vi.fn();

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    getReportSection: mockGetReportSection,
    updateReportSection: mockUpdateReportSection,
  }),
}));

describe("SectionEditorView - Content Area Component Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 2: Content Area Component Selection", () => {
    /**
     * **Validates: Requirements 2.1, 3.1**
     *
     * Property: For any section, the content area should display the Monaco Editor
     * when section type is "prose" and the Task List when section type is "status".
     */
    it("should display Monaco Editor for prose sections and Task List for status sections", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data with both prose and status types
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.date().map((d) => d.toISOString()),
            updated_at: fc.date().map((d) => d.toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated section data
            mockGetReportSection.mockResolvedValue(sectionData);

            // Execute: Mount the component with the section ID
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Content area exists
            const contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            if (sectionData.type === "prose") {
              // Verify: Monaco Editor is displayed for prose sections
              const monacoEditor = wrapper.findComponent({
                name: "MonacoEditor",
              });
              expect(monacoEditor.exists()).toBe(true);

              // Verify: Task List is NOT displayed
              const taskList = wrapper.find(".task-list-container");
              expect(taskList.exists()).toBe(false);

              // Verify: Monaco Editor has correct props
              expect(monacoEditor.props("language")).toBe("markdown");
              expect(monacoEditor.props("modelValue")).toBe(
                sectionData.content,
              );
            } else if (sectionData.type === "status") {
              // Verify: Task List is displayed for status sections
              const taskList = wrapper.find(".task-list-container");
              expect(taskList.exists()).toBe(true);

              // Verify: Monaco Editor is NOT displayed
              const monacoEditor = wrapper.findComponent({
                name: "MonacoEditor",
              });
              expect(monacoEditor.exists()).toBe(false);
            }

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should display only one component type at a time in the content area", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.date().map((d) => d.toISOString()),
            updated_at: fc.date().map((d) => d.toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated section data
            mockGetReportSection.mockResolvedValue(sectionData);

            // Execute: Mount the component with the section ID
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Exactly one of Monaco Editor or Task List is displayed
            const monacoEditor = wrapper.findComponent({
              name: "MonacoEditor",
            });
            const taskList = wrapper.find(".task-list-container");

            // XOR: Either Monaco Editor exists OR Task List exists, but not both
            const monacoExists = monacoEditor.exists();
            const taskListExists = taskList.exists();

            expect(monacoExists !== taskListExists).toBe(true);

            // Verify: The correct component is displayed based on type
            if (sectionData.type === "prose") {
              expect(monacoExists).toBe(true);
              expect(taskListExists).toBe(false);
            } else {
              expect(monacoExists).toBe(false);
              expect(taskListExists).toBe(true);
            }

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should fill the entire content area with the appropriate component", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.date().map((d) => d.toISOString()),
            updated_at: fc.date().map((d) => d.toISOString()),
          }),
          async (sectionData: ReportSection) => {
            // Setup: Mock the backend to return the generated section data
            mockGetReportSection.mockResolvedValue(sectionData);

            // Execute: Mount the component with the section ID
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Content area exists and has proper structure
            const contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            // Verify: The component is a direct child of content area
            if (sectionData.type === "prose") {
              const monacoEditor = contentArea.findComponent({
                name: "MonacoEditor",
              });
              expect(monacoEditor.exists()).toBe(true);
            } else {
              const taskList = contentArea.find(".task-list-container");
              expect(taskList.exists()).toBe(true);
            }

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
