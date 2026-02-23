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

describe("SectionEditorView - Property-Based Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 1: Section Data Loading", () => {
    /**
     * **Validates: Requirements 1.4, 9.5**
     *
     * Property: For any valid section ID in the route parameters, navigating to the
     * Section Editor View should load and display the correct section data from the backend.
     */
    it("should load and display correct section data for any valid section ID", async () => {
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

            // Verify: Backend was called with correct section ID
            expect(mockGetReportSection).toHaveBeenCalledWith(sectionData.id);

            // Verify: Section name is displayed correctly
            const nameInput = wrapper.find(".section-name-input");
            expect(nameInput.exists()).toBe(true);
            expect((nameInput.element as HTMLInputElement).value).toBe(
              sectionData.name,
            );

            // Verify: Section type is displayed correctly
            const typeSelector = wrapper.find(".section-type-selector");
            expect(typeSelector.exists()).toBe(true);
            expect((typeSelector.element as HTMLSelectElement).value).toBe(
              sectionData.type,
            );

            // Verify: Content is loaded for prose sections
            if (sectionData.type === "prose") {
              const monacoEditor = wrapper.findComponent({
                name: "MonacoEditor",
              });
              expect(monacoEditor.exists()).toBe(true);
              expect(monacoEditor.props("modelValue")).toBe(
                sectionData.content,
              );
            }

            // Verify: No error is displayed
            const errorElement = wrapper.find(".error");
            expect(errorElement.exists()).toBe(false);

            // Verify: Loading state is cleared
            const loadingElement = wrapper.find(".loading");
            expect(loadingElement.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle section loading errors gracefully for any section ID", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc
            .string({ minLength: 1, maxLength: 200 })
            .filter((s) => s.trim().length > 0),
          async (sectionId: number, errorMessage: string) => {
            // Setup: Mock the backend to throw an error
            mockGetReportSection.mockRejectedValue(new Error(errorMessage));

            // Execute: Mount the component with the section ID
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionId,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Backend was called with correct section ID
            expect(mockGetReportSection).toHaveBeenCalledWith(sectionId);

            // Verify: Error message is displayed (HTML rendering trims whitespace)
            const errorElement = wrapper.find(".error");
            expect(errorElement.exists()).toBe(true);
            expect(errorElement.text()).toContain(errorMessage.trim());

            // Verify: Loading state is cleared
            const loadingElement = wrapper.find(".loading");
            expect(loadingElement.exists()).toBe(false);

            // Verify: Content area is not displayed
            const contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should display loading state while fetching section data", async () => {
      await fc.assert(
        fc.asyncProperty(
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
            // Setup: Mock the backend with a delayed response
            let resolvePromise: (value: ReportSection) => void;
            const delayedPromise = new Promise<ReportSection>((resolve) => {
              resolvePromise = resolve;
            });
            mockGetReportSection.mockReturnValue(delayedPromise);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: sectionData.id,
              },
            });

            // Verify: Loading state is displayed immediately
            await nextTick();
            const loadingElement = wrapper.find(".loading");
            expect(loadingElement.exists()).toBe(true);
            expect(loadingElement.text()).toContain("Loading");

            // Verify: Content area is not displayed during loading
            let contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(false);

            // Resolve the promise
            resolvePromise!(sectionData);
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Loading state is cleared after data loads
            expect(wrapper.find(".loading").exists()).toBe(false);

            // Verify: Content area is now displayed
            contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
