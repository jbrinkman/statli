import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
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

describe("SectionEditorView - Save Button Disabled Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 16: Save Button Disabled During Save", () => {
    /**
     * **Validates: Requirements 6.6**
     *
     * Property: For any section, while a save operation is in progress, the save button
     * should be disabled to prevent duplicate submissions.
     */
    it("should disable save button during async save operation", async () => {
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
            fc.pre(newName.trim().length > 0); // Skip whitespace-only names

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            // Create a delayed promise to simulate async save
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
              resolveSave = resolve;
            });
            mockUpdateReportSection.mockReturnValue(savePromise);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Get save button and verify it's enabled before save
            const saveButton = wrapper.find(".btn-save");
            expect(saveButton.exists()).toBe(true);
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              false,
            );

            // Click save
            await saveButton.trigger("click");
            await nextTick();

            // Verify: Save button is disabled during save operation
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              true,
            );

            // Verify: Button text changes to "Saving..."
            expect(saveButton.text()).toBe("Saving...");

            // Complete the save
            resolveSave!();
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: Save button is re-enabled after save completes
            // Note: In the actual implementation, the component navigates away after save,
            // so we can't check the button state after completion in this test.
            // The important part is that it was disabled during the save operation.

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should prevent multiple save submissions when button is clicked rapidly", async () => {
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
            fc.pre(newName.trim().length > 0); // Skip whitespace-only names

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            // Create a delayed promise to simulate async save
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
              resolveSave = resolve;
            });
            mockUpdateReportSection.mockReturnValue(savePromise);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const saveButton = wrapper.find(".btn-save");

            // Click save multiple times rapidly
            await saveButton.trigger("click");
            await saveButton.trigger("click");
            await saveButton.trigger("click");
            await nextTick();

            // Verify: updateReportSection was called only once
            expect(mockUpdateReportSection).toHaveBeenCalledTimes(1);

            // Complete the save
            resolveSave!();
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should disable save button for prose sections during save", async () => {
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
            fc.pre(originalSection.name.trim().length > 0); // Skip sections with invalid names

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            // Create a delayed promise to simulate async save
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
              resolveSave = resolve;
            });
            mockUpdateReportSection.mockReturnValue(savePromise);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the content
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              false,
            );

            // Click save
            await saveButton.trigger("click");
            await nextTick();

            // Verify: Save button is disabled during save
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              true,
            );

            // Complete the save
            resolveSave!();
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should disable save button for status sections during save", async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc.string({ minLength: 1, maxLength: 100 }),
          async (originalSection: ReportSection, newName: string) => {
            fc.pre(newName !== originalSection.name);
            fc.pre(newName.trim().length > 0); // Skip whitespace-only names

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockLoadStatusDefinitions.mockResolvedValue(undefined);
            mockLoadTasksBySection.mockResolvedValue(undefined);

            // Create a delayed promise to simulate async save
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
              resolveSave = resolve;
            });
            mockUpdateReportSection.mockReturnValue(savePromise);

            const wrapper = mount(SectionEditorView, {
              props: { sectionId: originalSection.id },
            });

            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            const saveButton = wrapper.find(".btn-save");
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              false,
            );

            // Click save
            await saveButton.trigger("click");
            await nextTick();

            // Verify: Save button is disabled during save
            expect((saveButton.element as HTMLButtonElement).disabled).toBe(
              true,
            );

            // Complete the save
            resolveSave!();
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
