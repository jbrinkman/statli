/**
 * Property-Based Test: Keep Editing Confirmation Action
 *
 * Feature: section-editor-view
 * Property 22: Keep Editing Confirmation Action
 *
 * For any section with unsaved changes showing the confirmation dialog, selecting
 * "Keep Editing" should close the dialog and remain in edit mode without navigation.
 *
 * Validates: Requirements 8.6
 */

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

describe("SectionEditorView - Keep Editing Confirmation Action Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLoadStatusDefinitions.mockResolvedValue(undefined);
    mockLoadTasksBySection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Property 22: Keep Editing Confirmation Action", () => {
    /**
     * **Validates: Requirements 8.6**
     *
     * Property: For any section with unsaved changes showing the confirmation dialog,
     * selecting "Keep Editing" should close the dialog and remain in edit mode without navigation.
     */
    it("should close dialog and remain in edit mode when Keep Editing is clicked", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          // Generate a different name to create unsaved changes
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

            // Make a change to create unsaved changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Verify the change is still in the UI
            expect((nameInput.element as HTMLInputElement).value).toBe(newName);

            // Click cancel button to trigger confirmation dialog
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            // Verify confirmation dialog is shown
            let dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Click Keep Editing button
            const keepEditingButton = wrapper.find(".btn-keep-editing");
            expect(keepEditingButton.exists()).toBe(true);
            await keepEditingButton.trigger("click");
            await nextTick();

            // Verify dialog is closed
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Verify navigate-back event was NOT emitted (stayed in edit mode)
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Verify updateReportSection was NOT called (changes not saved yet)
            expect(mockUpdateReportSection).not.toHaveBeenCalled();

            // Verify the changes are still present in the UI
            expect((nameInput.element as HTMLInputElement).value).toBe(newName);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should preserve all unsaved changes after Keep Editing is clicked", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          // Generate modifications
          fc.record({
            newName: fc.string({ minLength: 1, maxLength: 100 }),
            newContent: fc.string({ maxLength: 5000 }),
          }),
          async (originalSection: ReportSection, modifications) => {
            // Ensure modifications are actually different
            fc.pre(
              modifications.newName !== originalSection.name ||
                modifications.newContent !== originalSection.content,
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

            // Make multiple changes
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(modifications.newName);
            await nextTick();

            const monacoInput = wrapper.find(".mock-monaco-editor input");
            await monacoInput.setValue(modifications.newContent);
            await monacoInput.trigger("input");
            await nextTick();

            // Click cancel and then Keep Editing
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            const keepEditingButton = wrapper.find(".btn-keep-editing");
            await keepEditingButton.trigger("click");
            await nextTick();

            // Verify all changes are still present
            expect((nameInput.element as HTMLInputElement).value).toBe(
              modifications.newName,
            );
            expect((monacoInput.element as HTMLInputElement).value).toBe(
              modifications.newContent,
            );

            // Verify no navigation occurred
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow user to continue editing after clicking Keep Editing", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
          }),
          // Generate two different names
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (
            originalSection: ReportSection,
            newName1: string,
            newName2: string,
          ) => {
            // Ensure both names are different from original and from each other
            fc.pre(
              newName1 !== originalSection.name &&
                newName2 !== originalSection.name &&
                newName1 !== newName2,
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

            // Make first change
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName1);
            await nextTick();

            // Click cancel and then Keep Editing
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            const keepEditingButton = wrapper.find(".btn-keep-editing");
            await keepEditingButton.trigger("click");
            await nextTick();

            // Make another change to verify editing can continue
            await nameInput.setValue(newName2);
            await nextTick();

            // Verify the second change is reflected
            expect((nameInput.element as HTMLInputElement).value).toBe(
              newName2,
            );

            // Verify still no navigation
            expect(wrapper.emitted("navigate-back")).toBeFalsy();

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should allow triggering confirmation dialog again after Keep Editing", async () => {
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
            created_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
            updated_at: fc
              .integer({ min: 1577836800000, max: 1924905600000 })
              .map((ts) => new Date(ts).toISOString()),
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

            // Make a change
            const nameInput = wrapper.find(".section-name-input");
            await nameInput.setValue(newName);
            await nextTick();

            // Click cancel and then Keep Editing
            const cancelButton = wrapper.find(".btn-cancel");
            await cancelButton.trigger("click");
            await nextTick();

            let dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            const keepEditingButton = wrapper.find(".btn-keep-editing");
            await keepEditingButton.trigger("click");
            await nextTick();

            // Verify dialog is closed
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(false);

            // Click cancel again
            await cancelButton.trigger("click");
            await nextTick();

            // Verify dialog appears again
            dialog = wrapper.find(".dialog-overlay");
            expect(dialog.exists()).toBe(true);

            // Cleanup
            wrapper.unmount();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
