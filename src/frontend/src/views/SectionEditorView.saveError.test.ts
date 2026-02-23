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

describe("SectionEditorView - Save Error Handling Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 15: Save Error Handling", () => {
    /**
     * **Validates: Requirements 6.5**
     *
     * Property: For any section, when save fails, the view should display an error
     * message and remain in edit mode without navigating away.
     */
    it("should display error message when save fails", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (
            originalSection: ReportSection,
            newName: string,
            errorMessage: string,
          ) => {
            fc.pre(newName !== originalSection.name);

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockUpdateReportSection.mockRejectedValue(new Error(errorMessage));
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Error message is displayed
            const errorElement = wrapper.find(".error");
            expect(errorElement.exists()).toBe(true);
            expect(errorElement.text()).toContain(errorMessage);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not navigate away when save fails", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            fc.pre(newName !== originalSection.name);

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockUpdateReportSection.mockRejectedValue(new Error("Save failed"));
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: navigate-back event was NOT emitted
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should remain in edit mode after save error", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            project_id: fc.integer({ min: 1, max: 1000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constant("prose"),
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
          fc.string({ maxLength: 5000 }),
          async (originalSection: ReportSection, newContent: string) => {
            fc.pre(newContent !== originalSection.content);

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockUpdateReportSection.mockRejectedValue(
              new Error("Network error"),
            );
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Content area still exists (still in edit mode)
            const contentArea = wrapper.find(".content-area");
            expect(contentArea.exists()).toBe(true);

            // Verify: Monaco editor still exists
            const monacoEditor = wrapper.find(".mock-monaco-editor");
            expect(monacoEditor.exists()).toBe(true);

            // Verify: Input still has the modified content
            const inputAfterError = wrapper.find(".mock-monaco-editor input");
            expect(inputAfterError.element.value).toBe(newContent);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should preserve unsaved changes after save error", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            fc.pre(newName !== originalSection.name);

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockUpdateReportSection.mockRejectedValue(new Error("Save failed"));
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Name input still has the modified value
            const nameInputAfterError = wrapper.find(".section-name-input");
            expect(
              (nameInputAfterError.element as HTMLInputElement).value,
            ).toBe(newName);

            // Verify: Unsaved changes are still detected
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Should show confirmation dialog because changes still exist
            const confirmDialog = wrapper.find(".dialog-overlay");
            expect(confirmDialog.exists()).toBe(true);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow retry after save error", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            fc.pre(newName !== originalSection.name);

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            // First call fails, second call succeeds
            mockUpdateReportSection
              .mockRejectedValueOnce(new Error("Network error"))
              .mockResolvedValueOnce(undefined);
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // First save attempt - should fail
            const saveButton = wrapper.find(".btn-save");
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Error is displayed
            let errorElement = wrapper.find(".error");
            expect(errorElement.exists()).toBe(true);

            // Second save attempt - should succeed
            await saveButton.trigger("click");
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: navigate-back event was emitted on successful retry
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")?.length).toBe(1);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
