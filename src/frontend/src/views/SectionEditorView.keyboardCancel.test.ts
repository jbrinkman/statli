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

describe("SectionEditorView - Keyboard Shortcut Cancel Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 18: Keyboard Shortcut Cancel", () => {
    /**
     * **Validates: Requirements 7.2**
     *
     * Property: For any section being edited, pressing Escape should trigger
     * the cancel operation.
     */
    it("should trigger cancel on Escape with no changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          async (section: ReportSection) => {
            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Create a keyboard event for Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: navigate-back event was emitted (cancel was triggered)
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Verify: No confirmation dialog shown (no changes)
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should show confirmation dialog on Escape with unsaved changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          // Generate a new name to create unsaved changes
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Create a keyboard event for Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: Confirmation dialog is shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Verify: navigate-back was NOT emitted yet (waiting for confirmation)
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should trigger cancel for prose sections with content changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate prose section data
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
          // Generate new content
          fc.string({ maxLength: 5000 }),
          async (section: ReportSection, newContent: string) => {
            // Ensure the new content is different
            fc.pre(newContent !== section.content);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the content
            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Create a keyboard event for Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: Confirmation dialog is shown (has unsaved changes)
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should trigger cancel for status sections with type changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          async (section: ReportSection) => {
            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Change the type to create unsaved changes
            const newType = section.type === "prose" ? "status" : "prose";
            const typeSelector = wrapper.find(".section-type-selector");
            await typeSelector.setValue(newType);
            await nextTick();

            // Create a keyboard event for Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });

            // Dispatch the event
            window.dispatchEvent(event);
            await nextTick();

            // Verify: Confirmation dialog is shown (has unsaved changes)
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow discarding changes after Escape", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          // Generate a new name
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Press Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });
            window.dispatchEvent(event);
            await nextTick();

            // Verify dialog is shown
            const dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click discard button
            const discardButton = wrapper.find(".btn-discard");
            await discardButton.trigger("click");
            await nextTick();

            // Verify: navigate-back was emitted
            expect(wrapper.emitted("navigate-back")).toBeTruthy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow keeping editing after Escape", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate section data
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
          // Generate a new name
          fc.string({ minLength: 1, maxLength: 100 }),
          async (section: ReportSection, newName: string) => {
            // Ensure the new name is different
            fc.pre(newName !== section.name);

            // Setup: Mock the backend
            mockGetReportSection.mockResolvedValue(section);
            mockUpdateReportSection.mockResolvedValue(undefined);

            // Execute: Mount the component
            const wrapper = mount(SectionEditorView, {
              props: {
                sectionId: section.id,
              },
            });

            // Wait for async data loading
            await nextTick();
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Modify the name
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Press Escape
            const event = new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            });
            window.dispatchEvent(event);
            await nextTick();

            // Verify dialog is shown
            let dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click keep editing button
            const keepEditingButton = wrapper.find(".btn-keep-editing");
            await keepEditingButton.trigger("click");
            await nextTick();

            // Verify: Dialog is closed
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify: navigate-back was NOT emitted
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Verify: Changes are still present
            const currentNameInput = wrapper.find(".section-name-input");
            expect((currentNameInput.element as HTMLInputElement).value).toBe(
              newName,
            );

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
