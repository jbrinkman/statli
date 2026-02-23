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

// Mock TaskList component
vi.mock("../components/TaskList.vue", () => ({
  default: {
    name: "TaskList",
    template: '<div class="mock-task-list">Task List</div>',
    props: [
      "tasks",
      "subtasks",
      "sections",
      "statusDefinitions",
      "loading",
      "error",
    ],
    emits: [
      "create-task",
      "edit-task",
      "delete-task",
      "create-subtask",
      "edit-subtask",
      "delete-subtask",
      "select-task",
      "select-subtask",
    ],
  },
}));

// Mock useReports composable
const mockGetReportSection = vi.fn();
const mockUpdateReportSection = vi.fn();
const mockLoadStatusDefinitions = vi.fn();
const mockStatusDefinitions = { value: [] };

vi.mock("../composables/useReports", () => ({
  useReports: () => ({
    getReportSection: mockGetReportSection,
    updateReportSection: mockUpdateReportSection,
    loadStatusDefinitions: mockLoadStatusDefinitions,
    statusDefinitions: mockStatusDefinitions,
  }),
}));

// Mock useTasks composable
const mockLoadTasksBySection = vi.fn();
const mockTasks = { value: [] };
const mockSubtasks = { value: [] };

vi.mock("../composables/useTasks", () => ({
  useTasks: () => ({
    tasks: mockTasks,
    subtasks: mockSubtasks,
    loadTasksBySection: mockLoadTasksBySection,
    createTask: vi.fn(),
    updateTask: vi.fn(),
    softDeleteTask: vi.fn(),
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    softDeleteSubtask: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}));

describe("SectionEditorView - Change Detection Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 5: Change Detection Accuracy", () => {
    /**
     * **Validates: Requirements 2.5, 3.5, 4.6, 8.8**
     *
     * Property: For any editing session, the change detection mechanism should correctly
     * identify when current state (name, type, or content) differs from the original state.
     */
    it("should detect name changes correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
          }),
          // Generate a different name
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            // Ensure the new name is actually different
            fc.pre(newName !== originalSection.name);

            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Initially no unsaved changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should not show confirmation dialog when no changes
            let confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(false);

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Verify: Now there should be unsaved changes
            await cancelButton.trigger("click");
            await nextTick();

            // Should show confirmation dialog when name changed
            confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(true);
            expect(confirmDialog.text()).toContain("Unsaved Changes");

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should detect type changes correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
          }),
          async (originalSection: ReportSection) => {
            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Initially no unsaved changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should not show confirmation dialog when no changes
            let confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(false);

            // Change the type to the opposite value
            const newType =
              originalSection.type === "prose" ? "status" : "prose";
            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue(newType);
            await nextTick();

            // Verify: Now there should be unsaved changes
            await cancelButton.trigger("click");
            await nextTick();

            // Should show confirmation dialog when type changed
            confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(true);
            expect(confirmDialog.text()).toContain("Unsaved Changes");

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should detect prose content changes correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original prose section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("prose"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
          }),
          // Generate different content
          fc.string({ maxLength: 5000 }),
          async (originalSection: ReportSection, newContent: string) => {
            // Ensure the new content is actually different
            fc.pre(newContent !== originalSection.content);

            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Initially no unsaved changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should not show confirmation dialog when no changes
            let confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(false);

            // Modify the content through the Monaco Editor mock
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Verify: Now there should be unsaved changes
            await cancelButton.trigger("click");
            await nextTick();

            // Should show confirmation dialog when content changed
            confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(true);
            expect(confirmDialog.text()).toContain("Unsaved Changes");

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not detect changes when values remain the same", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("prose", "status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
          }),
          async (originalSection: ReportSection) => {
            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Set values to the same as original (simulating user editing then reverting)
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(originalSection.name);
            await nextTick();

            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue(originalSection.type);
            await nextTick();

            if (originalSection.type === "prose") {
              const monacoInput = wrapper.find(".mock-monaco-editor input");
              await monacoInput.setValue(originalSection.content);
              await monacoInput.trigger("input");
              await nextTick();
            }

            // Verify: Should not detect changes when values are the same
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should not show confirmation dialog
            const confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should detect multiple simultaneous changes correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("prose"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
            updated_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
          }),
          // Generate new values
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 5000 }),
          async (
            originalSection: ReportSection,
            newName: string,
            newContent: string,
          ) => {
            // Ensure at least one value is different
            fc.pre(
              newName !== originalSection.name ||
                newContent !== originalSection.content,
            );

            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify multiple fields
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Verify: Should detect changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should show confirmation dialog
            const confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(true);
            expect(confirmDialog.text()).toContain("Unsaved Changes");

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not detect changes for status sections when only name/type unchanged", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original status section data
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("status"),
            content: fc.string({ maxLength: 5000 }),
            order: fc.integer({ min: 0, max: 100 }),
            is_enabled: fc.boolean(),
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          async (originalSection: ReportSection) => {
            // Setup: Mock the backend to return the original section data
            mockGetReportSection.mockResolvedValue(originalSection);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: originalSection.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // For status sections, content changes are not tracked
            // (tasks are managed separately)
            // So if name and type are unchanged, there should be no unsaved changes

            // Verify: Should not detect changes
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should not show confirmation dialog
            const confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
