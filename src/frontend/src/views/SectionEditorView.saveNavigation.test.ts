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

describe("SectionEditorView - Save Navigation Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 13: Successful Save Navigation", () => {
    /**
     * **Validates: Requirements 6.3, 9.3**
     *
     * Property: For any section, when save completes successfully, the view should
     * navigate back to the previous view.
     */
    it("should emit navigate-back event after successful save", async () => {
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
            fc.pre(newName.trim().length > 0); // Skip whitespace-only names

            mockGetReportSection.mockClear();
            mockUpdateReportSection.mockClear();
            mockLoadStatusDefinitions.mockClear();
            mockLoadTasksBySection.mockClear();

            mockGetReportSection.mockResolvedValue(originalSection);
            mockUpdateReportSection.mockResolvedValue(undefined);
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

            // Verify: navigate-back event was emitted after successful save
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")?.length).toBe(1);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should emit navigate-back for prose sections after save", async () => {
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
            mockUpdateReportSection.mockResolvedValue(undefined);
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

            // Verify: navigate-back event was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")?.length).toBe(1);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should emit navigate-back for status sections after save", async () => {
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
            mockUpdateReportSection.mockResolvedValue(undefined);
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

            // Verify: navigate-back event was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();
            expect(wrapper.emitted("navigate-back")?.length).toBe(1);

            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should navigate back only after save completes, not before", async () => {
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
            // Create a delayed promise to simulate async save
            let resolveSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
              resolveSave = resolve;
            });
            mockUpdateReportSection.mockReturnValue(savePromise);
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

            // Verify: navigate-back should NOT be emitted yet (save still in progress)
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Complete the save
            resolveSave!();
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify: NOW navigate-back should be emitted
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
